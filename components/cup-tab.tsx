"use client";

import { useEffect, useMemo, useState, useEffectEvent } from "react";
import { TeamSwatch } from "@/components/team-swatch";
import { createClient } from "@/lib/supabase/client";
import type { Match, MatchPlayer, Player, Round, Team } from "@/lib/types";

const CUP_TARGET = 18;

type CupTabProps = {
  tournamentId: string;
  teams: Team[];
  rounds: Round[];
  players: Player[];
};

type MatchWithPlayers = Match & { players: MatchPlayer[] };

function formatPoints(value: number) {
  if (Number.isInteger(value)) return value.toFixed(0);
  return value.toFixed(1);
}

function shortRoundLabel(round: Round) {
  const name = round.name;
  if (/friday am/i.test(name)) return "Friday AM · Front 9 · Best Ball";
  if (/friday pm/i.test(name)) return "Friday PM · Back 9 · Scramble / Shamble";
  if (/saturday am/i.test(name)) return "Saturday AM · Front 9 · Scramble";
  if (/1v1|singles|match play/i.test(name)) {
    return `Saturday · Singles (${round.hole_count === 9 ? "9" : "18"} holes)`;
  }
  if (/seeding/i.test(name)) return "Thursday · Front 9 · Seeding";
  return name;
}

function dayLabel(dayNumber: number, playDate: string | null) {
  if (playDate) {
    const date = new Date(`${playDate}T12:00:00`);
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }
  return `Day ${dayNumber}`;
}

function pointsEarned(
  match: Match,
  teamId: string,
): { points: number; label: string } {
  const value = Number(match.points_value);
  if (match.status !== "complete") {
    return { points: 0, label: "Pending" };
  }
  if (match.is_halved) {
    return { points: value / 2, label: `Halve · +${formatPoints(value / 2)}` };
  }
  if (match.winning_team_id === teamId) {
    return { points: value, label: `Win · +${formatPoints(value)}` };
  }
  return { points: 0, label: "Loss · 0" };
}

export function CupTab({ tournamentId, teams, rounds, players }: CupTabProps) {
  const [matches, setMatches] = useState<MatchWithPlayers[]>([]);
  const [message, setMessage] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null);

  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.name.localeCompare(b.name)),
    [teams],
  );
  const [teamA, teamB] = sortedTeams;
  const roundIds = useMemo(() => rounds.map((r) => r.id), [rounds]);

  const competitionRounds = useMemo(
    () =>
      [...rounds]
        .filter((r) => r.scoring_format === "match")
        .sort((a, b) => {
          if (a.day_number !== b.day_number) return a.day_number - b.day_number;
          return (a.play_date ?? "").localeCompare(b.play_date ?? "");
        }),
    [rounds],
  );

  const selectedRound = competitionRounds.find((r) => r.id === selectedRoundId);

  const refresh = useEffectEvent(async () => {
    if (roundIds.length === 0) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("matches")
      .select(
        "id, round_id, match_number, side_size, points_value, status, winning_team_id, is_halved",
      )
      .in("round_id", roundIds)
      .order("match_number");

    if (error) {
      setMessage(
        error.message.includes("does not exist")
          ? "Matches tables are missing. Run supabase/schema-matches.sql in the Supabase SQL Editor."
          : error.message,
      );
      return;
    }

    const baseMatches = ((data as Match[]) ?? []).map((m) => ({
      ...m,
      points_value: Number(m.points_value),
      side_size: m.side_size as 1 | 2,
    }));

    let matchPlayers: MatchPlayer[] = [];
    if (baseMatches.length > 0) {
      const { data: mpRows, error: mpError } = await supabase
        .from("match_players")
        .select("match_id, player_id, team_id")
        .in(
          "match_id",
          baseMatches.map((m) => m.id),
        );
      if (mpError) {
        setMessage(mpError.message);
        return;
      }
      matchPlayers = (mpRows as MatchPlayer[]) ?? [];
    }

    setMatches(
      baseMatches.map((m) => ({
        ...m,
        players: matchPlayers.filter((p) => p.match_id === m.id),
      })),
    );
    setUpdatedAt(new Date());
    setMessage("");
  });

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      void refresh();
    }, 8000);
    return () => window.clearInterval(id);
  }, [tournamentId, roundIds.join(",")]);

  function pointsFor(teamId: string, roundId?: string) {
    let total = 0;
    for (const match of matches) {
      if (match.status !== "complete") continue;
      if (roundId && match.round_id !== roundId) continue;
      if (match.is_halved) {
        total += Number(match.points_value) / 2;
        continue;
      }
      if (match.winning_team_id === teamId) {
        total += Number(match.points_value);
      }
    }
    return total;
  }

  function playerName(id: string) {
    return players.find((p) => p.id === id)?.display_name ?? "Unknown";
  }

  const pointsA = teamA ? pointsFor(teamA.id) : 0;
  const pointsB = teamB ? pointsFor(teamB.id) : 0;
  const completed = matches.filter((m) => m.status === "complete").length;
  const pending = matches.filter((m) => m.status === "pending").length;
  const leaderPoints = Math.max(pointsA, pointsB);
  const cupDecided = leaderPoints >= CUP_TARGET;
  const leaderName =
    pointsA === pointsB
      ? null
      : pointsA > pointsB
        ? teamA?.name
        : teamB?.name;

  const sessionsByDay = useMemo(() => {
    const map = new Map<number, Round[]>();
    for (const round of competitionRounds) {
      const list = map.get(round.day_number) ?? [];
      list.push(round);
      map.set(round.day_number, list);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [competitionRounds]);

  if (!teamA || !teamB) {
    return (
      <section className="mx-auto max-w-2xl px-5 py-6">
        <h1 className="font-display text-3xl text-ink">The Cup</h1>
        <p className="mt-3 text-muted">
          Assign players to both teams on the Teams tab to unlock the board.
        </p>
      </section>
    );
  }

  if (selectedRound) {
    const sessionMatches = matches
      .filter((m) => m.round_id === selectedRound.id)
      .sort((a, b) => a.match_number - b.match_number);
    const sessionA = pointsFor(teamA.id, selectedRound.id);
    const sessionB = pointsFor(teamB.id, selectedRound.id);

    return (
      <section className="mx-auto w-full max-w-2xl px-5 py-6">
        <button
          type="button"
          onClick={() => setSelectedRoundId(null)}
          className="text-sm text-muted hover:text-ink"
        >
          ← Back to Cup board
        </button>
        <h1 className="font-display mt-3 text-3xl text-ink">
          {shortRoundLabel(selectedRound)}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Session score{" "}
          <span className="font-semibold text-ink">
            {formatPoints(sessionA)} – {formatPoints(sessionB)}
          </span>
        </p>

        <ul className="mt-6 space-y-3 animate-fade">
          {sessionMatches.length === 0 ? (
            <li className="border border-mist bg-white px-4 py-4 text-sm text-muted">
              No matches have been set for this session yet. Add them on the
              Matches tab.
            </li>
          ) : (
            sessionMatches.map((match) => {
              const sideA = match.players.filter((p) => p.team_id === teamA.id);
              const sideB = match.players.filter((p) => p.team_id === teamB.id);
              const resultA = pointsEarned(match, teamA.id);
              const resultB = pointsEarned(match, teamB.id);

              return (
                <li key={match.id} className="border border-mist bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs tracking-wide text-fairway uppercase">
                      Match {match.match_number} · {formatPoints(Number(match.points_value))}{" "}
                      pt match
                    </p>
                    <p className="text-xs text-muted">
                      {match.status === "complete"
                        ? match.is_halved
                          ? "Halved"
                          : match.winning_team_id === teamA.id
                            ? `${teamA.name} win`
                            : `${teamB.name} win`
                        : "Pending"}
                    </p>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="border border-mist px-3 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <TeamSwatch color={teamA.color} />
                          <p className="text-sm font-semibold text-ink">
                            {teamA.name}
                          </p>
                        </div>
                        <p className="text-xs font-medium text-ink">
                          {resultA.label}
                        </p>
                      </div>
                      <p className="mt-2 text-sm text-muted">
                        {sideA.length === 0
                          ? "No players listed"
                          : sideA
                              .map((p) => playerName(p.player_id))
                              .join(" / ")}
                      </p>
                    </div>

                    <div className="border border-mist px-3 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <TeamSwatch color={teamB.color} />
                          <p className="text-sm font-semibold text-ink">
                            {teamB.name}
                          </p>
                        </div>
                        <p className="text-xs font-medium text-ink">
                          {resultB.label}
                        </p>
                      </div>
                      <p className="mt-2 text-sm text-muted">
                        {sideB.length === 0
                          ? "No players listed"
                          : sideB
                              .map((p) => playerName(p.player_id))
                              .join(" / ")}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-2xl px-5 py-6">
      <div className="animate-rise">
        <p className="text-xs tracking-[0.22em] text-fairway uppercase">
          Live standings
        </p>
        <h1 className="font-display mt-2 text-3xl text-ink">The Cup</h1>
        <p className="mt-2 text-sm text-muted">
          First to {CUP_TARGET}. Wins take full points; halves are split.
        </p>
      </div>

      <div className="atmosphere relative mt-6 overflow-hidden px-4 py-8 text-fog animate-rise sm:px-6 sm:py-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.45'/%3E%3C/svg%3E\")",
          }}
        />

        <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
          <div className="text-center">
            <div className="mb-3 flex items-center justify-center gap-2">
              <TeamSwatch color={teamA.color ?? "#582C83"} />
              <p className="text-xs tracking-[0.16em] text-mist/90 uppercase sm:text-sm">
                {teamA.name}
              </p>
            </div>
            <p className="font-display text-6xl leading-none sm:text-7xl">
              {formatPoints(pointsA)}
            </p>
          </div>

          <div className="text-center">
            <p className="font-display text-2xl text-gold sm:text-3xl">–</p>
            <p className="mt-2 text-[10px] tracking-[0.2em] text-mist/70 uppercase">
              of {CUP_TARGET}
            </p>
          </div>

          <div className="text-center">
            <div className="mb-3 flex items-center justify-center gap-2">
              <TeamSwatch color={teamB.color ?? "#FFFFFF"} />
              <p className="text-xs tracking-[0.16em] text-mist/90 uppercase sm:text-sm">
                {teamB.name}
              </p>
            </div>
            <p className="font-display text-6xl leading-none sm:text-7xl">
              {formatPoints(pointsB)}
            </p>
          </div>
        </div>

        <div className="relative mt-8 h-2 w-full overflow-hidden bg-white/15">
          <div
            className="absolute inset-y-0 left-0 bg-white/80 transition-all duration-700"
            style={{
              width: `${Math.min(100, (pointsA / CUP_TARGET) * 100)}%`,
            }}
          />
          <div
            className="absolute inset-y-0 right-0 transition-all duration-700"
            style={{
              width: `${Math.min(100, (pointsB / CUP_TARGET) * 100)}%`,
              backgroundColor: "rgba(196, 163, 90, 0.85)",
            }}
          />
        </div>

        <p className="relative mt-4 text-center text-sm text-mist/85">
          {cupDecided && leaderName
            ? `${leaderName} has claimed The Cup`
            : pointsA === pointsB
              ? `Tied · ${formatPoints(CUP_TARGET - leaderPoints)} to go`
              : `${leaderName} leads · ${formatPoints(CUP_TARGET - leaderPoints)} to ${CUP_TARGET}`}
        </p>
      </div>

      <div className="mt-8 animate-fade">
        <h2 className="text-sm font-semibold tracking-[0.16em] text-fairway uppercase">
          By session
        </h2>
        <p className="mt-1 text-xs text-muted">Tap a session to see each match.</p>

        <div className="mt-4 space-y-5">
          {sessionsByDay.map(([dayNumber, dayRounds]) => (
            <div key={dayNumber}>
              <p className="mb-2 text-xs tracking-wide text-muted uppercase">
                {dayLabel(dayNumber, dayRounds[0]?.play_date ?? null)}
              </p>
              <ul className="space-y-2">
                {dayRounds.map((round) => {
                  const a = pointsFor(teamA.id, round.id);
                  const b = pointsFor(teamB.id, round.id);
                  const sessionMatches = matches.filter(
                    (m) => m.round_id === round.id,
                  );
                  const done = sessionMatches.filter(
                    (m) => m.status === "complete",
                  ).length;
                  const total = sessionMatches.length;

                  return (
                    <li key={round.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedRoundId(round.id)}
                        className="w-full border border-mist bg-white px-4 py-3 text-left transition hover:border-fairway"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-ink">
                              {shortRoundLabel(round)}
                            </p>
                            <p className="mt-0.5 text-xs text-muted">
                              {total === 0
                                ? "No matches yet · tap for details"
                                : `${done}/${total} matches final · tap for details`}
                            </p>
                          </div>
                          <p className="font-display text-2xl tabular-nums text-ink">
                            {formatPoints(a)}
                            <span className="mx-1.5 text-muted">–</span>
                            {formatPoints(b)}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 text-sm text-muted">
        <span>
          {completed} completed · {pending} pending
        </span>
        <button
          type="button"
          onClick={() => void refresh()}
          className="underline-offset-2 hover:text-ink hover:underline"
        >
          {updatedAt
            ? `Updated ${updatedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}`
            : "Refresh"}
        </button>
      </div>

      {message ? <p className="mt-3 text-sm text-danger">{message}</p> : null}
    </section>
  );
}
