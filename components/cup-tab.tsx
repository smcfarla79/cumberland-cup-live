"use client";

import { useEffect, useMemo, useState, useEffectEvent } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { TeamSwatch } from "@/components/team-swatch";
import { calculateMatchPlayStanding } from "@/lib/match-play";
import { compactMatchStatus } from "@/lib/match-status";
import { createClient } from "@/lib/supabase/client";
import type { Hole, Match, MatchPlayer, Player, Round, Team } from "@/lib/types";

const CUP_TARGET = 18;

type CupTabProps = {
  tournamentId: string;
  teams: Team[];
  rounds: Round[];
  players: Player[];
  holes: Hole[];
  sessionPlayerId?: string;
  onGoToPlay?: (roundId: string) => void;
};

type MatchWithPlayers = Match & { players: MatchPlayer[] };

function formatPoints(value: number) {
  if (Number.isInteger(value)) return value.toFixed(0);
  return value.toFixed(1);
}

function shortRoundLabel(round: Round) {
  const name = round.name;
  if (/friday am/i.test(name)) return "Friday AM · Best Ball";
  if (/friday pm/i.test(name)) return "Friday PM · Scramble / Shamble";
  if (/saturday am/i.test(name)) return "Saturday AM · Scramble";
  if (/1v1|singles|match play/i.test(name)) {
    return `Singles · ${round.hole_count === 9 ? "9" : "18"} holes`;
  }
  if (/seeding/i.test(name)) return "Seeding";
  return name;
}

function lastName(displayName: string) {
  const parts = displayName.trim().split(/\s+/);
  return parts[parts.length - 1] ?? displayName;
}

function firstInitial(displayName: string) {
  const parts = displayName.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "").toUpperCase();
}

/** Prefer last names; disambiguate with initial; shorten very long names. */
function boardName(displayName: string, siblingNames: string[]) {
  const last = lastName(displayName);
  const sameLast = siblingNames.filter(
    (n) => lastName(n).toLowerCase() === last.toLowerCase(),
  ).length;
  if (sameLast > 1) return `${firstInitial(displayName)}. ${last}`;
  if (last.length > 11) return `${firstInitial(displayName)}. ${last.slice(0, 9)}`;
  return last;
}

function sideBoardNames(side: MatchPlayer[], allPlayers: Player[]) {
  const names = side.map(
    (sp) =>
      allPlayers.find((p) => p.id === sp.player_id)?.display_name ?? "—",
  );
  return names.map((n) => boardName(n, names));
}

export function CupTab({
  tournamentId,
  teams,
  rounds,
  players,
  holes,
  sessionPlayerId,
  onGoToPlay,
}: CupTabProps) {
  const [matches, setMatches] = useState<MatchWithPlayers[]>([]);
  const [scoresByRound, setScoresByRound] = useState<
    Record<string, Record<string, Record<number, number>>>
  >({});
  const [message, setMessage] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.name.localeCompare(b.name)),
    [teams],
  );
  const [teamA, teamB] = sortedTeams;
  const roundIds = useMemo(() => rounds.map((r) => r.id), [rounds]);
  const purple = teamA?.color ?? "#582C83";

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

    const withPlayers = baseMatches.map((m) => ({
      ...m,
      players: matchPlayers.filter((p) => p.match_id === m.id),
    }));

    const playerIds = [...new Set(matchPlayers.map((p) => p.player_id))];
    const byRound: Record<string, Record<string, Record<number, number>>> = {};

    if (playerIds.length > 0) {
      const { data: scoreRows } = await supabase
        .from("hole_scores")
        .select("player_id, hole_number, strokes, round_id")
        .in("round_id", roundIds)
        .in("player_id", playerIds);

      (scoreRows ?? []).forEach((row) => {
        const rid = row.round_id as string;
        const pid = row.player_id as string;
        if (!byRound[rid]) byRound[rid] = {};
        if (!byRound[rid][pid]) byRound[rid][pid] = {};
        byRound[rid][pid][row.hole_number as number] = row.strokes as number;
      });
    }

    setMatches(withPlayers);
    setScoresByRound(byRound);
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

  function standingFor(match: MatchWithPlayers, round: Round) {
    if (!teamA || !teamB) return null;
    return calculateMatchPlayStanding({
      round,
      holes,
      sideA: match.players.filter((p) => p.team_id === teamA.id),
      sideB: match.players.filter((p) => p.team_id === teamB.id),
      sideSize: match.side_size,
      players,
      scoresByPlayer: scoresByRound[round.id] ?? {},
      teamAName: teamA.name,
      teamBName: teamB.name,
    });
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

  const nowPlaying = useMemo(() => {
    if (!sessionPlayerId) return null;
    const myPending = matches
      .filter(
        (m) =>
          m.status === "pending" &&
          m.players.some((p) => p.player_id === sessionPlayerId),
      )
      .sort((a, b) => a.match_number - b.match_number);
    const match = myPending[0];
    if (!match) return null;
    const round = rounds.find((r) => r.id === match.round_id) ?? null;
    if (!round) return null;
    return { match, round };
  }, [matches, sessionPlayerId, rounds]);

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

  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-5 sm:px-5">
      {/* Overall cup score — always visible at top */}
      <div className="atmosphere relative overflow-hidden px-3 py-5 text-fog animate-rise sm:px-5 sm:py-6">
        <div className="relative flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1 text-left">
            <div className="mb-1 flex items-center gap-1.5">
              <TeamSwatch color={purple} className="h-2.5 w-2.5" />
              <p className="truncate text-[10px] tracking-[0.14em] text-mist/85 uppercase">
                {teamA.name}
              </p>
            </div>
            <p className="font-display text-5xl leading-none tabular-nums sm:text-6xl">
              {formatPoints(pointsA)}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-center px-2">
            <BrandLogo size={40} className="ring-1 ring-white/25" />
            <p className="mt-1.5 text-[9px] tracking-[0.18em] text-mist/65 uppercase">
              of {CUP_TARGET}
            </p>
          </div>

          <div className="min-w-0 flex-1 text-right">
            <div className="mb-1 flex items-center justify-end gap-1.5">
              <p className="truncate text-[10px] tracking-[0.14em] text-mist/85 uppercase">
                {teamB.name}
              </p>
              <TeamSwatch color={teamB.color ?? "#FFFFFF"} className="h-2.5 w-2.5" />
            </div>
            <p className="font-display text-5xl leading-none tabular-nums sm:text-6xl">
              {formatPoints(pointsB)}
            </p>
          </div>
        </div>

        <div className="relative mt-4 h-1.5 w-full overflow-hidden bg-white/15">
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

        <p className="relative mt-2.5 text-center text-xs text-mist/80">
          {cupDecided && leaderName
            ? `${leaderName} has claimed The Cup`
            : pointsA === pointsB
              ? `Tied · ${formatPoints(CUP_TARGET - leaderPoints)} to go`
              : `${leaderName} leads · ${formatPoints(CUP_TARGET - leaderPoints)} to ${CUP_TARGET}`}
        </p>
      </div>

      {nowPlaying && onGoToPlay ? (
        <button
          type="button"
          onClick={() => onGoToPlay(nowPlaying.round.id)}
          className="mt-3 w-full border border-pine/40 bg-white px-3 py-2.5 text-left text-sm transition hover:border-pine"
        >
          <span className="font-medium text-ink">Your match</span>
          <span className="text-muted">
            {" "}
            · {shortRoundLabel(nowPlaying.round)} · Match{" "}
            {nowPlaying.match.match_number} →
          </span>
        </button>
      ) : null}

      {/* Match board — top to bottom by session */}
      <div className="mt-5 animate-fade">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xs font-semibold tracking-[0.16em] text-fairway uppercase">
              Match board
            </h2>
            <p className="mt-0.5 text-[11px] text-muted">
              Who&apos;s up · who&apos;s down · tap to score
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="shrink-0 text-[11px] text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            {updatedAt
              ? updatedAt.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "Refresh"}
          </button>
        </div>

        <div className="space-y-5">
          {competitionRounds.map((round) => {
            const sessionA = pointsFor(teamA.id, round.id);
            const sessionB = pointsFor(teamB.id, round.id);
            const sessionMatches = matches
              .filter((m) => m.round_id === round.id)
              .sort((x, y) => x.match_number - y.match_number);
            const done = sessionMatches.filter(
              (m) => m.status === "complete",
            ).length;

            return (
              <div key={round.id}>
                <div className="mb-1.5 flex items-baseline justify-between gap-2 border-b border-ink/15 pb-1.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {shortRoundLabel(round)}
                    </p>
                    <p className="text-[10px] text-muted">
                      {sessionMatches.length === 0
                        ? "No matches yet"
                        : `${done}/${sessionMatches.length} final`}
                    </p>
                  </div>
                  <p className="font-display shrink-0 text-xl tabular-nums text-ink">
                    {formatPoints(sessionA)}
                    <span className="mx-1 text-muted">–</span>
                    {formatPoints(sessionB)}
                  </p>
                </div>

                {/* Column labels */}
                <div className="mb-0.5 grid grid-cols-[1fr_4.5rem_1fr] gap-1 px-1 text-[9px] tracking-wider text-muted uppercase">
                  <span className="flex items-center gap-1 truncate">
                    <TeamSwatch color={purple} className="h-1.5 w-1.5" />
                    {teamA.name}
                  </span>
                  <span className="text-center">Status</span>
                  <span className="flex items-center justify-end gap-1 truncate">
                    {teamB.name}
                    <TeamSwatch
                      color={teamB.color ?? "#FFFFFF"}
                      className="h-1.5 w-1.5"
                    />
                  </span>
                </div>

                {sessionMatches.length === 0 ? (
                  <p className="px-1 py-3 text-xs text-muted">
                    Lineups not set for this session.
                  </p>
                ) : (
                  <div className="border border-ink/20 bg-white">
                    {sessionMatches.map((match, index) => {
                      const sideA = match.players.filter(
                        (p) => p.team_id === teamA.id,
                      );
                      const sideB = match.players.filter(
                        (p) => p.team_id === teamB.id,
                      );
                      const namesA = sideBoardNames(sideA, players);
                      const namesB = sideBoardNames(sideB, players);
                      const standing = standingFor(match, round);
                      const closedEarly = Boolean(
                        standing?.finalResult &&
                          standing.finalResult !== "halve" &&
                          !standing.complete,
                      );
                      const status = standing
                        ? compactMatchStatus({
                            lead: standing.lead,
                            holesPlayed: standing.holesPlayed,
                            holesRemaining: standing.holesRemaining,
                            finalResult: standing.finalResult,
                            closedEarly,
                          })
                        : "Not started";
                      const lead = standing?.lead ?? 0;
                      const aUp = lead > 0;
                      const bUp = lead < 0;
                      const started = (standing?.holesPlayed ?? 0) > 0;
                      const includesMe =
                        !!sessionPlayerId &&
                        match.players.some(
                          (p) => p.player_id === sessionPlayerId,
                        );
                      const statusDisplay =
                        status === "Not started"
                          ? "vs"
                          : status === "All square"
                            ? "AS"
                            : status;

                      return (
                        <button
                          key={match.id}
                          type="button"
                          onClick={() => onGoToPlay?.(round.id)}
                          className={[
                            "grid w-full grid-cols-[1fr_4.5rem_1fr] items-center gap-1 px-1.5 py-2 text-left transition",
                            index > 0 ? "border-t border-ink/12" : "",
                            includesMe ? "bg-pine/[0.04]" : "hover:bg-fog/80",
                          ].join(" ")}
                        >
                          {/* Team A */}
                          <div
                            className={[
                              "min-w-0 rounded-sm px-1.5 py-1",
                              aUp ? "bg-[rgba(88,44,131,0.1)]" : "",
                            ].join(" ")}
                          >
                            {namesA.length === 0 ? (
                              <p className="text-xs text-muted">—</p>
                            ) : (
                              namesA.map((name, i) => (
                                <p
                                  key={sideA[i]?.player_id ?? `${name}-${i}`}
                                  className={[
                                    "truncate text-xs leading-tight sm:text-[13px]",
                                    aUp
                                      ? "font-semibold"
                                      : started
                                        ? "font-medium text-ink/70"
                                        : "font-medium text-ink",
                                  ].join(" ")}
                                  style={aUp ? { color: purple } : undefined}
                                >
                                  {name}
                                </p>
                              ))
                            )}
                          </div>

                          {/* Status */}
                          <div className="flex flex-col items-center justify-center text-center">
                            <p
                              className={[
                                "font-display text-sm leading-none tracking-wide sm:text-base",
                                aUp
                                  ? "font-semibold"
                                  : bUp
                                    ? "font-semibold text-ink"
                                    : "text-muted",
                              ].join(" ")}
                              style={aUp ? { color: purple } : undefined}
                            >
                              {statusDisplay.toUpperCase()}
                            </p>
                            <p className="mt-0.5 text-[9px] tabular-nums text-muted">
                              {standing?.holesPlayed
                                ? `Thru ${standing.holesPlayed}`
                                : match.status === "complete"
                                  ? "Final"
                                  : "—"}
                            </p>
                          </div>

                          {/* Team B */}
                          <div
                            className={[
                              "min-w-0 rounded-sm px-1.5 py-1 text-right",
                              bUp ? "bg-ink/[0.05]" : "",
                            ].join(" ")}
                          >
                            {namesB.length === 0 ? (
                              <p className="text-xs text-muted">—</p>
                            ) : (
                              namesB.map((name, i) => (
                                <p
                                  key={sideB[i]?.player_id ?? `${name}-${i}`}
                                  className={[
                                    "truncate text-xs leading-tight text-ink sm:text-[13px]",
                                    bUp
                                      ? "font-semibold"
                                      : started
                                        ? "font-medium text-ink/70"
                                        : "font-medium",
                                  ].join(" ")}
                                >
                                  {name}
                                </p>
                              ))
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-5 text-center text-[11px] text-muted">
        {completed} completed · {pending} pending · first to {CUP_TARGET}
      </p>

      {message ? <p className="mt-3 text-sm text-danger">{message}</p> : null}
    </section>
  );
}
