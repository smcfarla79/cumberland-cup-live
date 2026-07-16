"use client";

import { useEffect, useMemo, useState, useEffectEvent } from "react";
import { MatchScoreboard } from "@/components/match-scoreboard";
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
};

type MatchWithPlayers = Match & { players: MatchPlayer[] };

function playerName(players: Player[], id: string) {
  return players.find((p) => p.id === id)?.display_name ?? "Unknown";
}

export function ScoreTab({
  sessionPlayerId,
  sessionPlayerName,
  players,
  rounds,
  holes,
  teams,
  isAdmin,
}: ScoreTabProps) {
  const [selectedRound, setSelectedRound] = useState<Round | null>(null);
  const [matches, setMatches] = useState<MatchWithPlayers[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.name.localeCompare(b.name)),
    [teams],
  );

  const loadMatches = useEffectEvent(async (roundId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("matches")
      .select(
        "id, round_id, match_number, side_size, points_value, status, winning_team_id, is_halved",
      )
      .eq("round_id", roundId)
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

    setMatches(
      base.map((m) => ({
        ...m,
        players: matchPlayers.filter((p) => p.match_id === m.id),
      })),
    );
    setMessage("");
  });

  useEffect(() => {
    if (!selectedRound) {
      setMatches([]);
      setSelectedMatchId(null);
      return;
    }
    void loadMatches(selectedRound.id);
  }, [selectedRound?.id]);

  const selectedMatch =
    matches.find((m) => m.id === selectedMatchId) ?? null;

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
        onBack={() => setSelectedMatchId(null)}
      />
    );
  }

  if (selectedRound) {
    const [teamA, teamB] = sortedTeams;
    return (
      <section className="mx-auto w-full max-w-2xl px-5 py-6">
        <button
          type="button"
          onClick={() => setSelectedRound(null)}
          className="text-sm text-muted hover:text-ink"
        >
          ← All sessions
        </button>
        <h1 className="font-display mt-3 text-3xl text-ink">
          {selectedRound.name}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {formatLabel(resolvePlayFormat(selectedRound))} · tap a match for
          hole-by-hole scores
        </p>

        <ul className="mt-6 space-y-3 animate-fade">
          {matches.length === 0 ? (
            <li className="border border-mist bg-white px-4 py-4 text-sm text-muted">
              No matches yet for this session. Set lineups on the Matches tab
              first.
            </li>
          ) : (
            matches.map((match) => {
              const sideA = match.players.filter((p) => p.team_id === teamA?.id);
              const sideB = match.players.filter((p) => p.team_id === teamB?.id);
              const includesMe = match.players.some(
                (p) => p.player_id === sessionPlayerId,
              );
              return (
                <li key={match.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedMatchId(match.id)}
                    className="w-full border border-mist bg-white px-4 py-4 text-left transition hover:border-fairway"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs tracking-wide text-fairway uppercase">
                        Match {match.match_number}
                        {includesMe ? " · your match" : ""}
                      </p>
                      <p className="text-xs text-muted">
                        {match.status === "complete" ? "Final" : "In progress"}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-ink">
                      <span className="font-semibold">{teamA?.name}: </span>
                      {sideA.length
                        ? sideA
                            .map((p) => playerName(players, p.player_id))
                            .join(" / ")
                        : "—"}
                    </p>
                    <p className="mt-1 text-sm text-ink">
                      <span className="font-semibold">{teamB?.name}: </span>
                      {sideB.length
                        ? sideB
                            .map((p) => playerName(players, p.player_id))
                            .join(" / ")
                        : "—"}
                    </p>
                  </button>
                </li>
              );
            })
          )}
        </ul>
        {message ? <p className="mt-3 text-sm text-danger">{message}</p> : null}
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-2xl px-5 py-6">
      <div className="animate-rise">
        <h1 className="font-display text-3xl text-ink">Scores</h1>
        <p className="mt-2 text-sm text-muted">
          Pick a session, then a match, to see hole-by-hole scoring
          {isAdmin
            ? ". As admin, you can edit any player’s hole."
            : `. Signed in as ${sessionPlayerName.split(" ")[0]} — you can edit your score and your partner’s, not opponents.`}
        </p>
      </div>

      <ul className="mt-6 space-y-3 animate-fade">
        {rounds.map((round) => (
          <li key={round.id}>
            <button
              type="button"
              onClick={() => setSelectedRound(round)}
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
