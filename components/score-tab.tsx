"use client";

import { useEffect, useMemo, useState, useEffectEvent } from "react";
import { LiveMatchCard } from "@/components/live-match-card";
import { MatchScoreboard } from "@/components/match-scoreboard";
import { ScoreEntry } from "@/components/score-entry";
import { calculateMatchPlayStanding } from "@/lib/match-play";
import { compactMatchStatus } from "@/lib/match-status";
import { formatLabel, resolvePlayFormat } from "@/lib/scoring";
import { createClient } from "@/lib/supabase/client";
import type {
  Hole,
  Match,
  MatchPlayer,
  Player,
  Round,
  Team,
} from "@/lib/types";

type ScoreTabProps = {
  sessionPlayerId: string;
  sessionPlayerName: string;
  players: Player[];
  rounds: Round[];
  holes: Hole[];
  teams: Team[];
  isAdmin: boolean;
  title?: string;
  initialRoundId?: string | null;
  onConsumeInitialRound?: () => void;
};

type MatchWithPlayers = Match & { players: MatchPlayer[] };

function playerName(players: Player[], id: string) {
  return players.find((p) => p.id === id)?.display_name ?? "Unknown";
}

function shortSessionLabel(round: Round) {
  const name = round.name;
  if (/friday am/i.test(name)) return "Fri AM";
  if (/friday pm/i.test(name)) return "Fri PM";
  if (/saturday am/i.test(name)) return "Sat AM";
  if (/1v1|singles|match play/i.test(name)) return "Singles";
  if (/seeding/i.test(name)) return "Seeding";
  return round.name.split("—")[0]?.trim() || round.name;
}

export function ScoreTab({
  sessionPlayerId,
  sessionPlayerName,
  players,
  rounds,
  holes,
  teams,
  isAdmin,
  title = "Play",
  initialRoundId = null,
  onConsumeInitialRound,
}: ScoreTabProps) {
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

  const [selectedRound, setSelectedRound] = useState<Round | null>(null);
  const [matches, setMatches] = useState<MatchWithPlayers[]>([]);
  const [scoresByPlayer, setScoresByPlayer] = useState<
    Record<string, Record<number, number>>
  >({});
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [strokePlayerId, setStrokePlayerId] = useState<string | null>(null);
  const [pickingSession, setPickingSession] = useState(false);
  const [message, setMessage] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.name.localeCompare(b.name)),
    [teams],
  );
  const [teamA, teamB] = sortedTeams;

  const loadLiveBoard = useEffectEvent(async (round: Round) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("matches")
      .select(
        "id, round_id, match_number, side_size, points_value, status, winning_team_id, is_halved",
      )
      .eq("round_id", round.id)
      .order("match_number");

    if (error) {
      setMessage(error.message);
      setMatches([]);
      return;
    }

    const base = ((data as Match[]) ?? []).map((m) => ({
      ...m,
      points_value: Number(m.points_value),
      side_size: m.side_size as 1 | 2,
    }));

    let matchPlayers: MatchPlayer[] = [];
    if (base.length > 0) {
      const { data: mpRows, error: mpError } = await supabase
        .from("match_players")
        .select("match_id, player_id, team_id")
        .in(
          "match_id",
          base.map((m) => m.id),
        );
      if (mpError) {
        setMessage(mpError.message);
        return;
      }
      matchPlayers = (mpRows as MatchPlayer[]) ?? [];
    }

    const withPlayers = base.map((m) => ({
      ...m,
      players: matchPlayers.filter((p) => p.match_id === m.id),
    }));

    const playerIds = [...new Set(matchPlayers.map((p) => p.player_id))];
    const scoreMap: Record<string, Record<number, number>> = {};
    for (const id of playerIds) scoreMap[id] = {};

    if (playerIds.length > 0) {
      const { data: scoreRows } = await supabase
        .from("hole_scores")
        .select("player_id, hole_number, strokes")
        .eq("round_id", round.id)
        .in("player_id", playerIds);

      (scoreRows ?? []).forEach((row) => {
        const pid = row.player_id as string;
        if (!scoreMap[pid]) scoreMap[pid] = {};
        scoreMap[pid][row.hole_number as number] = row.strokes as number;
      });
    }

    setMatches(withPlayers);
    setScoresByPlayer(scoreMap);
    setUpdatedAt(new Date());
    setMessage("");
  });

  // Deep-link from Cup “Now playing”
  useEffect(() => {
    if (!initialRoundId) return;
    const round = rounds.find((r) => r.id === initialRoundId) ?? null;
    if (round) {
      setSelectedRound(round);
      setSelectedMatchId(null);
      setStrokePlayerId(null);
      setPickingSession(false);
    }
    onConsumeInitialRound?.();
  }, [initialRoundId, rounds, onConsumeInitialRound]);

  // Auto-open the best live match session on first visit
  useEffect(() => {
    if (selectedRound || pickingSession || initialRoundId) return;
    if (competitionRounds.length === 0) return;

    let cancelled = false;
    const supabase = createClient();

    void (async () => {
      const { data } = await supabase
        .from("matches")
        .select("id, round_id, status")
        .in(
          "round_id",
          competitionRounds.map((r) => r.id),
        );

      if (cancelled) return;

      const rows = data ?? [];
      const pendingByRound = new Map<string, number>();
      const totalByRound = new Map<string, number>();
      for (const row of rows) {
        const rid = row.round_id as string;
        totalByRound.set(rid, (totalByRound.get(rid) ?? 0) + 1);
        if (row.status === "pending") {
          pendingByRound.set(rid, (pendingByRound.get(rid) ?? 0) + 1);
        }
      }

      const preferred =
        competitionRounds.find((r) => (pendingByRound.get(r.id) ?? 0) > 0) ??
        competitionRounds.find((r) => (totalByRound.get(r.id) ?? 0) > 0) ??
        competitionRounds[0];

      if (preferred) setSelectedRound(preferred);
    })();

    return () => {
      cancelled = true;
    };
  }, [competitionRounds, selectedRound, pickingSession, initialRoundId]);

  useEffect(() => {
    if (!selectedRound) {
      setMatches([]);
      setScoresByPlayer({});
      setSelectedMatchId(null);
      setStrokePlayerId(null);
      return;
    }

    if (selectedRound.scoring_format === "stroke") {
      setMatches([]);
      setScoresByPlayer({});
      setSelectedMatchId(null);
      setStrokePlayerId(isAdmin ? null : sessionPlayerId);
      return;
    }

    setStrokePlayerId(null);
    void loadLiveBoard(selectedRound);
    const id = window.setInterval(() => {
      void loadLiveBoard(selectedRound);
    }, 8000);
    return () => window.clearInterval(id);
  }, [selectedRound?.id, isAdmin, sessionPlayerId]);

  const selectedMatch =
    matches.find((m) => m.id === selectedMatchId) ?? null;

  const strokePlayer =
    strokePlayerId != null
      ? players.find((p) => p.id === strokePlayerId) ?? null
      : null;

  function standingFor(match: MatchWithPlayers) {
    if (!selectedRound || !teamA || !teamB) return null;
    return calculateMatchPlayStanding({
      round: selectedRound,
      holes,
      sideA: match.players.filter((p) => p.team_id === teamA.id),
      sideB: match.players.filter((p) => p.team_id === teamB.id),
      sideSize: match.side_size,
      players,
      scoresByPlayer,
      teamAName: teamA.name,
      teamBName: teamB.name,
    });
  }

  if (selectedRound && selectedMatch) {
    return (
      <MatchScoreboard
        round={selectedRound}
        match={selectedMatch}
        holes={holes}
        players={players}
        teams={teams}
        sessionPlayerId={sessionPlayerId}
        isAdmin={isAdmin}
        onBack={() => {
          setSelectedMatchId(null);
          void loadLiveBoard(selectedRound);
        }}
      />
    );
  }

  if (selectedRound && selectedRound.scoring_format === "stroke" && strokePlayer) {
    return (
      <ScoreEntry
        round={selectedRound}
        playerId={strokePlayer.id}
        playerName={strokePlayer.display_name}
        playerHandicap={strokePlayer.handicap}
        holes={holes}
        players={players}
        isAdminEdit={isAdmin && strokePlayer.id !== sessionPlayerId}
        onBack={() => {
          if (isAdmin) {
            setStrokePlayerId(null);
          } else {
            setSelectedRound(null);
            setPickingSession(true);
          }
        }}
      />
    );
  }

  if (selectedRound && selectedRound.scoring_format === "stroke") {
    return (
      <section className="mx-auto w-full max-w-2xl px-5 py-6">
        <button
          type="button"
          onClick={() => {
            setSelectedRound(null);
            setPickingSession(true);
          }}
          className="text-sm text-muted hover:text-ink"
        >
          ← All sessions
        </button>
        <h1 className="font-display mt-3 text-3xl text-ink">
          {selectedRound.name}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Individual stroke play · pick whose card to enter
          {isAdmin ? " (admin)" : ""}.
        </p>
        <ul className="mt-6 space-y-2 animate-fade">
          {players.map((player) => (
            <li key={player.id}>
              <button
                type="button"
                onClick={() => setStrokePlayerId(player.id)}
                className="w-full border border-mist bg-white px-4 py-3.5 text-left text-ink transition hover:border-fairway"
              >
                {player.display_name}
                {player.id === sessionPlayerId ? " · you" : ""}
                {player.handicap != null ? ` · HCP ${player.handicap}` : ""}
              </button>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  // Live match board (default Play experience)
  if (selectedRound && selectedRound.scoring_format === "match") {
    return (
      <section className="mx-auto w-full max-w-2xl px-5 py-6">
        <div className="animate-rise">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl text-ink">{title}</h1>
              <p className="mt-1 text-sm text-muted">
                Live match board · tap a match to score
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedRound(null);
                setPickingSession(true);
              }}
              className="shrink-0 text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
            >
              All sessions
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 animate-fade">
          {competitionRounds.map((round) => {
            const active = round.id === selectedRound.id;
            return (
              <button
                key={round.id}
                type="button"
                onClick={() => {
                  setSelectedRound(round);
                  setSelectedMatchId(null);
                }}
                className={[
                  "shrink-0 px-3 py-2 text-sm font-medium",
                  active
                    ? "bg-pine text-fog"
                    : "border border-mist bg-white text-muted hover:text-ink",
                ].join(" ")}
              >
                {shortSessionLabel(round)}
              </button>
            );
          })}
          {rounds.some((r) => r.scoring_format === "stroke") ? (
            <button
              type="button"
              onClick={() => {
                const stroke = rounds.find((r) => r.scoring_format === "stroke");
                if (stroke) {
                  setSelectedRound(stroke);
                  setSelectedMatchId(null);
                }
              }}
              className="shrink-0 border border-mist bg-white px-3 py-2 text-sm font-medium text-muted hover:text-ink"
            >
              Seeding
            </button>
          ) : null}
        </div>

        <p className="mt-3 text-xs text-muted">
          {formatLabel(resolvePlayFormat(selectedRound))} ·{" "}
          {selectedRound.name.replace(/^.*?—\s*/, "")}
        </p>

        <ul className="mt-4 space-y-3 animate-fade">
          {matches.length === 0 ? (
            <li className="border border-mist bg-white px-4 py-4 text-sm text-muted">
              No matches yet for this session. Admins can set lineups under Play
              → Lineups.
            </li>
          ) : (
            matches.map((match) => {
              const sideA = match.players.filter((p) => p.team_id === teamA?.id);
              const sideB = match.players.filter((p) => p.team_id === teamB?.id);
              const includesMe = match.players.some(
                (p) => p.player_id === sessionPlayerId,
              );
              const standing = standingFor(match);
              const played = standing?.holesPlayed ?? 0;
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

              if (!teamA || !teamB) return null;

              return (
                <li key={match.id}>
                  <LiveMatchCard
                    matchNumber={match.match_number}
                    pointsValue={Number(match.points_value)}
                    includesMe={includesMe}
                    sideA={sideA}
                    sideB={sideB}
                    teamA={teamA}
                    teamB={teamB}
                    players={players}
                    holesPlayed={played}
                    status={status}
                    aLeading={(standing?.lead ?? 0) > 0}
                    bLeading={(standing?.lead ?? 0) < 0}
                    isFinal={
                      match.status === "complete" ||
                      Boolean(standing?.finalResult)
                    }
                    finalWinner={
                      match.is_halved
                        ? "halve"
                        : match.winning_team_id === teamA.id
                          ? "team_a"
                          : match.winning_team_id === teamB.id
                            ? "team_b"
                            : standing?.finalResult ?? null
                    }
                    onClick={() => setSelectedMatchId(match.id)}
                  />
                </li>
              );
            })
          )}
        </ul>

        <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted">
          <span>
            Signed in as {sessionPlayerName.split(" ")[0]}
            {isAdmin ? " · admin" : ""}
          </span>
          <button
            type="button"
            onClick={() => void loadLiveBoard(selectedRound)}
            className="underline-offset-2 hover:text-ink hover:underline"
          >
            {updatedAt
              ? `Updated ${updatedAt.toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                  second: "2-digit",
                })}`
              : "Refresh"}
          </button>
        </div>
        {message ? <p className="mt-3 text-sm text-danger">{message}</p> : null}
      </section>
    );
  }

  // Explicit session picker (All sessions / first load fallback)
  return (
    <section className="mx-auto w-full max-w-2xl px-5 py-6">
      <div className="animate-rise">
        <h1 className="font-display text-3xl text-ink">{title}</h1>
        <p className="mt-2 text-sm text-muted">
          Pick a session for the live match board
          {isAdmin
            ? ", or use Lineups to set pairings."
            : `. Signed in as ${sessionPlayerName.split(" ")[0]}.`}
        </p>
      </div>

      <ul className="mt-6 space-y-3 animate-fade">
        {rounds.map((round) => (
          <li key={round.id}>
            <button
              type="button"
              onClick={() => {
                setSelectedRound(round);
                setPickingSession(false);
                setSelectedMatchId(null);
              }}
              className="w-full border border-mist bg-white px-4 py-4 text-left transition hover:border-fairway"
            >
              <span className="block text-xs tracking-wide text-fairway uppercase">
                Day {round.day_number}
                {round.play_date ? ` · ${round.play_date}` : ""}
                {" · "}
                {formatLabel(resolvePlayFormat(round))}
              </span>
              <span className="mt-1 block text-base font-medium text-ink">
                {round.name}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
