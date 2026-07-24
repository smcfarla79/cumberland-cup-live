"use client";

import { useEffect, useMemo, useState, useEffectEvent } from "react";
import { MatchScoreboard } from "@/components/match-scoreboard";
import {
  calculateMatchPlayStanding,
  isMatchPlayFormat,
} from "@/lib/match-play";
import { formatLabel, resolvePlayFormat } from "@/lib/scoring";
import { createClient } from "@/lib/supabase/client";
import { teamAccentColor } from "@/lib/team-colors";
import type {
  Hole,
  Match,
  MatchPlayer,
  Player,
  Round,
  Team,
  TeamAssignment,
} from "@/lib/types";

type MatchesTabProps = {
  players: Player[];
  teams: Team[];
  rounds: Round[];
  holes: Hole[];
  isAdmin?: boolean;
  sessionPlayerId?: string;
  title?: string;
};

type MatchWithPlayers = Match & { players: MatchPlayer[] };

function defaultSideSize(round: Round): 1 | 2 {
  return resolvePlayFormat(round) === "singles" ? 1 : 2;
}

function defaultPoints(round: Round): number {
  return resolvePlayFormat(round) === "singles" ? 2 : 1;
}

export function MatchesTab({
  players,
  teams,
  rounds,
  holes,
  isAdmin = false,
  sessionPlayerId = "",
  title = "Lineups",
}: MatchesTabProps) {
  const competitionRounds = useMemo(
    () => rounds.filter((r) => r.scoring_format === "match"),
    [rounds],
  );
  const [roundId, setRoundId] = useState(competitionRounds[0]?.id ?? "");
  const [assignments, setAssignments] = useState<TeamAssignment[]>([]);
  const [matches, setMatches] = useState<MatchWithPlayers[]>([]);
  const [scoresByPlayer, setScoresByPlayer] = useState<
    Record<string, Record<number, number>>
  >({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  const [adjusting, setAdjusting] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [detailMatchId, setDetailMatchId] = useState<string | null>(null);

  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.name.localeCompare(b.name)),
    [teams],
  );
  const activeRound =
    competitionRounds.find((r) => r.id === roundId) ?? competitionRounds[0];
  const sideSize = activeRound ? defaultSideSize(activeRound) : 2;
  const pointsValue = activeRound ? defaultPoints(activeRound) : 1;
  const [teamA, teamB] = sortedTeams;

  const refresh = useEffectEvent(async () => {
    if (!activeRound || teams.length === 0) return;
    const supabase = createClient();

    const [{ data: assignmentRows }, { data: matchRows, error: matchError }] =
      await Promise.all([
        supabase
          .from("team_players")
          .select("team_id, player_id")
          .in(
            "team_id",
            teams.map((t) => t.id),
          ),
        supabase
          .from("matches")
          .select(
            "id, round_id, match_number, side_size, points_value, status, winning_team_id, is_halved",
          )
          .eq("round_id", activeRound.id)
          .order("match_number"),
      ]);

    if (matchError) {
      setMessage(
        matchError.message.includes("does not exist")
          ? "Matches tables are missing. Run supabase/schema-matches.sql in the Supabase SQL Editor."
          : matchError.message,
      );
      return;
    }

    const baseMatches = ((matchRows as Match[]) ?? []).map((m) => ({
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
    const scoreMap: Record<string, Record<number, number>> = {};
    for (const id of playerIds) scoreMap[id] = {};

    if (playerIds.length > 0) {
      const { data: scoreRows } = await supabase
        .from("hole_scores")
        .select("player_id, hole_number, strokes")
        .eq("round_id", activeRound.id)
        .in("player_id", playerIds);

      (scoreRows ?? []).forEach((row) => {
        const pid = row.player_id as string;
        if (!scoreMap[pid]) scoreMap[pid] = {};
        scoreMap[pid][row.hole_number as number] = row.strokes as number;
      });
    }

    const usedPlayerIds = new Set(
      withPlayers.flatMap((m) => m.players.map((p) => p.player_id)),
    );

    setAssignments((assignmentRows as TeamAssignment[]) ?? []);
    setMatches(withPlayers);
    setScoresByPlayer(scoreMap);
    // Keep in-progress picks across live refreshes; only drop players who
    // are no longer available (already lined up elsewhere).
    setPicked((prev) => {
      const next: Record<string, string[]> = {};
      for (const team of sortedTeams) {
        next[team.id] = (prev[team.id] ?? []).filter(
          (id) => !usedPlayerIds.has(id),
        );
      }
      return next;
    });
    setSelectedPlayerId((id) =>
      id && usedPlayerIds.has(id) ? null : id,
    );
    setMessage("");

    // Auto-finalize completed matches from hole scores
    if (teamA && teamB && isMatchPlayFormat(activeRound)) {
      for (const match of withPlayers) {
        const sideA = match.players.filter((p) => p.team_id === teamA.id);
        const sideB = match.players.filter((p) => p.team_id === teamB.id);
        const standing = calculateMatchPlayStanding({
          round: activeRound,
          holes,
          sideA,
          sideB,
          sideSize: match.side_size,
          players,
          scoresByPlayer: scoreMap,
          teamAName: teamA.name,
          teamBName: teamB.name,
        });

        if (!standing.finalResult) continue;

        const desired = {
          status: "complete" as const,
          is_halved: standing.finalResult === "halve",
          winning_team_id:
            standing.finalResult === "halve"
              ? null
              : standing.finalResult === "team_a"
                ? teamA.id
                : teamB.id,
        };

        const already =
          match.status === "complete" &&
          match.is_halved === desired.is_halved &&
          match.winning_team_id === desired.winning_team_id;

        if (!already) {
          await supabase.from("matches").update(desired).eq("id", match.id);
          match.status = desired.status;
          match.is_halved = desired.is_halved;
          match.winning_team_id = desired.winning_team_id;
        }
      }
      setMatches([...withPlayers]);
    }
  });

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      void refresh();
    }, 10000);
    return () => window.clearInterval(id);
  }, [roundId, teams, holes, players]);

  function assignedPlayerIds() {
    return new Set(matches.flatMap((m) => m.players.map((p) => p.player_id)));
  }

  function roster(teamId: string) {
    const onTeam = new Set(
      assignments.filter((a) => a.team_id === teamId).map((a) => a.player_id),
    );
    const used = assignedPlayerIds();
    return players
      .filter((p) => onTeam.has(p.id) && !used.has(p.id))
      .sort((a, b) => a.display_name.localeCompare(b.display_name));
  }

  function teamIdForPlayer(playerId: string): string | null {
    return assignments.find((a) => a.player_id === playerId)?.team_id ?? null;
  }

  function playerLabel(id: string) {
    return players.find((p) => p.id === id)?.display_name ?? "Unknown";
  }

  function standingFor(match: MatchWithPlayers) {
    if (!activeRound || !teamA || !teamB) return null;
    return calculateMatchPlayStanding({
      round: activeRound,
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

  function togglePick(teamId: string, playerId: string) {
    setPicked((prev) => {
      const current = prev[teamId] ?? [];
      if (current.includes(playerId)) {
        return { ...prev, [teamId]: current.filter((id) => id !== playerId) };
      }
      if (current.length >= sideSize) return prev;
      return { ...prev, [teamId]: [...current, playerId] };
    });
  }

  async function createMatch() {
    if (!activeRound || sortedTeams.length < 2) return;
    const sideA = picked[teamA.id] ?? [];
    const sideB = picked[teamB.id] ?? [];
    if (sideA.length !== sideSize || sideB.length !== sideSize) {
      setMessage(`Pick ${sideSize} player${sideSize === 1 ? "" : "s"} per team.`);
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const nextNumber =
      matches.reduce((max, m) => Math.max(max, m.match_number), 0) + 1;

    const { data: created, error } = await supabase
      .from("matches")
      .insert({
        round_id: activeRound.id,
        match_number: nextNumber,
        side_size: sideSize,
        points_value: pointsValue,
        status: "pending",
      })
      .select("id")
      .single();

    if (error || !created) {
      setBusy(false);
      setMessage(error?.message ?? "Could not create match.");
      return;
    }

    const rows = [
      ...sideA.map((player_id) => ({
        match_id: created.id,
        player_id,
        team_id: teamA.id,
      })),
      ...sideB.map((player_id) => ({
        match_id: created.id,
        player_id,
        team_id: teamB.id,
      })),
    ];
    const { error: mpError } = await supabase.from("match_players").insert(rows);
    setBusy(false);
    if (mpError) {
      setMessage(mpError.message);
      return;
    }
    setPicked(
      Object.fromEntries(sortedTeams.map((t) => [t.id, [] as string[]])),
    );
    await refresh();
  }

  async function removePlayerFromMatch(matchId: string, playerId: string) {
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("match_players")
      .delete()
      .eq("match_id", matchId)
      .eq("player_id", playerId);
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    if (selectedPlayerId === playerId) setSelectedPlayerId(null);
    setMessage("");
    await refresh();
  }

  async function placeSelectedInMatch(matchId: string, teamId: string) {
    if (!selectedPlayerId) return;
    const playerTeam = teamIdForPlayer(selectedPlayerId);
    if (playerTeam !== teamId) {
      setMessage("That player belongs to the other team.");
      return;
    }

    const match = matches.find((m) => m.id === matchId);
    if (!match) return;
    const onSide = match.players.filter((p) => p.team_id === teamId);
    if (onSide.length >= match.side_size) {
      setMessage(
        `This side already has ${match.side_size} player(s). Remove one first.`,
      );
      return;
    }
    if (match.players.some((p) => p.player_id === selectedPlayerId)) {
      setMessage("That player is already in this match.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.from("match_players").insert({
      match_id: matchId,
      player_id: selectedPlayerId,
      team_id: teamId,
    });
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setSelectedPlayerId(null);
    setMessage("");
    await refresh();
  }

  async function deleteMatch(matchId: string) {
    const match = matches.find((item) => item.id === matchId);
    if (!match) return;

    const confirmed = window.confirm(
      "Delete this match and any scores entered by its players for this round?",
    );
    if (!confirmed) return;

    setBusy(true);
    const supabase = createClient();
    const { error: matchError } = await supabase
      .from("matches")
      .delete()
      .eq("id", matchId);
    if (matchError) {
      setBusy(false);
      setMessage(matchError.message);
      return;
    }

    const playerIds = match.players.map((player) => player.player_id);
    if (playerIds.length > 0) {
      const { error: scoreError } = await supabase
        .from("hole_scores")
        .delete()
        .eq("round_id", match.round_id)
        .in("player_id", playerIds);
      if (scoreError) {
        setBusy(false);
        setMessage(
          `Match deleted, but its old scores could not be cleared: ${scoreError.message}`,
        );
        await refresh();
        return;
      }
    }

    setBusy(false);
    setDetailMatchId(null);
    setMessage("");
    await refresh();
  }

  const canCreateAnotherMatch = useMemo(() => {
    if (!teamA || !teamB) return false;
    const availableA = roster(teamA.id).length;
    const availableB = roster(teamB.id).length;
    return availableA >= sideSize && availableB >= sideSize;
  }, [matches, assignments, players, sideSize, teamA, teamB]);

  const detailMatch = matches.find((m) => m.id === detailMatchId) ?? null;

  if (competitionRounds.length === 0) {
    return (
      <section className="mx-auto max-w-2xl px-5 py-6">
        <h1 className="font-display text-3xl text-ink">{title}</h1>
        <p className="mt-3 text-muted">No match-play rounds found yet.</p>
      </section>
    );
  }

  if (detailMatch && activeRound && teamA && teamB) {
    return (
      <MatchScoreboard
        round={activeRound}
        match={detailMatch}
        holes={holes}
        players={players}
        teams={teams}
        sessionPlayerId={sessionPlayerId}
        isAdmin={isAdmin}
        onBack={() => {
          setDetailMatchId(null);
          void refresh();
        }}
      />
    );
  }

  return (
    <section className="mx-auto w-full max-w-2xl px-5 py-6">
      <div className="animate-rise">
        <h1 className="font-display text-3xl text-ink">{title}</h1>
        <p className="mt-2 text-sm text-muted">
          Set lineups for each session. Players score from the Score view on
          Play.
        </p>
      </div>

      <label className="mt-5 block animate-fade">
        <span className="mb-2 block text-sm text-muted">Session</span>
        <select
          value={activeRound?.id ?? ""}
          onChange={(e) => {
            setRoundId(e.target.value);
            setDetailMatchId(null);
            setAdjusting(false);
            setSelectedPlayerId(null);
            setPicked(
              Object.fromEntries(sortedTeams.map((t) => [t.id, [] as string[]])),
            );
          }}
          className="w-full rounded-2xl border border-mist bg-white px-4 py-3 text-ink shadow-[0_4px_14px_rgba(20,32,27,0.06)] outline-none focus:border-fairway"
        >
          {competitionRounds.map((round) => (
            <option key={round.id} value={round.id}>
              {round.name}
            </option>
          ))}
        </select>
      </label>

      {isAdmin && matches.length > 0 ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => {
              setAdjusting((v) => !v);
              setSelectedPlayerId(null);
              setMessage("");
            }}
            className={[
              "w-full rounded-2xl px-4 py-3 text-sm font-semibold transition",
              adjusting
                ? "border border-pine bg-white text-pine"
                : "bg-pine text-fog shadow-[0_4px_14px_rgba(12,31,24,0.3)] hover:brightness-110",
            ].join(" ")}
          >
            {adjusting ? "Done adjusting" : "Adjust lineups"}
          </button>
        </div>
      ) : null}

      {adjusting && isAdmin ? (
        <div className="mt-4 rounded-2xl border border-fairway/40 bg-fog/80 p-4 animate-fade">
          <p className="text-sm text-ink">
            Tap someone in the pool, then tap an empty slot on a match. Tap{" "}
            <span className="font-semibold">×</span> on a lined-up player to
            send them back to the pool — no need to delete the whole match.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {sortedTeams.map((team) => {
              const pool = roster(team.id);
              return (
                <div key={team.id}>
                  <p className="mb-2 text-xs font-semibold tracking-wide text-fairway uppercase">
                    Pool · {team.name}
                  </p>
                  {pool.length === 0 ? (
                    <p className="text-sm text-muted">Everyone is assigned</p>
                  ) : (
                    <ul className="flex flex-wrap gap-2">
                      {pool.map((player) => {
                        const selected = selectedPlayerId === player.id;
                        return (
                          <li key={player.id}>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                setSelectedPlayerId((id) =>
                                  id === player.id ? null : player.id,
                                )
                              }
                              className={[
                                "rounded-full px-3.5 py-2 text-sm transition",
                                selected
                                  ? "bg-pine text-fog ring-2 ring-fairway ring-offset-2"
                                  : "border border-mist bg-white text-ink hover:border-fairway",
                              ].join(" ")}
                            >
                              {player.display_name}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
          {selectedPlayerId ? (
            <p className="mt-3 text-sm text-fairway">
              Selected: {playerLabel(selectedPlayerId)}. Tap an empty slot
              below.
            </p>
          ) : null}
        </div>
      ) : null}

      {isAdmin && !adjusting && canCreateAnotherMatch ? (
        <div className="mt-6 rounded-2xl border border-mist bg-white p-4 shadow-[0_6px_20px_rgba(20,32,27,0.07)] animate-fade">
          <h2 className="text-sm font-semibold tracking-wide text-fairway uppercase">
            New match · {sideSize}v{sideSize}
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {sortedTeams.map((team) => {
              const available = roster(team.id);
              return (
                <div key={team.id}>
                  <p className="mb-2 text-sm font-medium text-ink">
                    {team.name}{" "}
                    <span className="text-muted">
                      ({(picked[team.id] ?? []).length}/{sideSize})
                    </span>
                  </p>
                  <ul className="space-y-1">
                    {available.map((player) => {
                      const selected = (picked[team.id] ?? []).includes(
                        player.id,
                      );
                      return (
                        <li key={player.id}>
                          <button
                            type="button"
                            onClick={() => togglePick(team.id, player.id)}
                            className={[
                              "w-full rounded-xl px-3 py-2 text-left text-sm transition",
                              selected
                                ? "bg-pine text-fog"
                                : "border border-mist text-ink hover:border-fairway",
                            ].join(" ")}
                          >
                            {player.display_name}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void createMatch()}
            className="mt-4 w-full rounded-2xl bg-pine px-4 py-3 text-sm font-semibold text-fog shadow-[0_4px_14px_rgba(12,31,24,0.3)] transition hover:brightness-110 disabled:opacity-50"
          >
            Add match
          </button>
        </div>
      ) : isAdmin && !adjusting && matches.length > 0 && !canCreateAnotherMatch ? (
        <p className="mt-6 text-sm text-muted">
          All players are assigned. Use Adjust lineups to move people around.
        </p>
      ) : null}

      <ul className="mt-6 space-y-3">
        {matches.length === 0 ? (
          <li className="text-sm text-muted">No matches set for this session yet.</li>
        ) : (
          matches.map((match) => {
            const standing = standingFor(match);
            const sideA = match.players.filter((p) => p.team_id === teamA?.id);
            const sideB = match.players.filter((p) => p.team_id === teamB?.id);
            const incomplete =
              sideA.length < match.side_size || sideB.length < match.side_size;

            return (
              <li
                key={match.id}
                className="rounded-2xl border border-mist bg-white p-4 shadow-[0_6px_20px_rgba(20,32,27,0.07)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (!adjusting) setDetailMatchId(match.id);
                    }}
                    className="text-left"
                  >
                    <p className="text-xs tracking-wide text-fairway uppercase">
                      Match {match.match_number} · {match.points_value} pt
                      {incomplete ? " · incomplete" : ""}
                    </p>
                    <p className="mt-1 text-base font-semibold text-ink">
                      {standing?.statusLabel ??
                        (incomplete ? "Needs players" : "Not started")}
                    </p>
                    {!adjusting ? (
                    <p className="mt-1 text-xs text-muted">
                      Tap to score hole-by-hole
                    </p>
                    ) : null}
                  </button>
                  {isAdmin && !adjusting ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void deleteMatch(match.id)}
                      className="text-xs text-muted underline"
                    >
                      Delete
                    </button>
                  ) : null}
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {[
                    { team: teamA, side: sideA },
                    { team: teamB, side: sideB },
                  ].map(({ team, side }) => {
                    if (!team) return null;
                    const emptySlots = Math.max(
                      0,
                      match.side_size - side.length,
                    );
                    return (
                      <div key={team.id}>
                        <p
                          className="text-xs font-semibold"
                          style={{
                            color: teamAccentColor(
                              team.color,
                              team.id === teamA?.id ? "gold" : "green",
                            ),
                          }}
                        >
                          {team.name}
                        </p>
                        <ul className="mt-1 space-y-1">
                          {side.map((player) => (
                            <li
                              key={player.player_id}
                              className="flex items-center justify-between gap-2 text-sm"
                              style={{
                                color: teamAccentColor(
                                  team.color,
                                  team.id === teamA?.id ? "gold" : "green",
                                ),
                              }}
                            >
                              <span>{playerLabel(player.player_id)}</span>
                              {adjusting ? (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void removePlayerFromMatch(
                                      match.id,
                                      player.player_id,
                                    )
                                  }
                                  className="px-2 py-0.5 text-base leading-none text-muted hover:bg-mist hover:text-ink"
                                  aria-label={`Remove ${playerLabel(player.player_id)}`}
                                >
                                  ×
                                </button>
                              ) : null}
                            </li>
                          ))}
                          {adjusting
                            ? Array.from({ length: emptySlots }).map((_, i) => (
                                <li key={`empty-${team.id}-${i}`}>
                                  <button
                                    type="button"
                                    disabled={busy || !selectedPlayerId}
                                    onClick={() =>
                                      void placeSelectedInMatch(
                                        match.id,
                                        team.id,
                                      )
                                    }
                                    className={[
                                      "w-full rounded-xl border border-dashed px-2.5 py-1.5 text-left text-sm",
                                      selectedPlayerId &&
                                      teamIdForPlayer(selectedPlayerId) ===
                                        team.id
                                        ? "border-fairway text-fairway"
                                        : "border-mist text-muted",
                                    ].join(" ")}
                                  >
                                    {selectedPlayerId &&
                                    teamIdForPlayer(selectedPlayerId) ===
                                      team.id
                                      ? "Tap to place here"
                                      : "Empty slot"}
                                  </button>
                                </li>
                              ))
                            : null}
                        </ul>
                      </div>
                    );
                  })}
                </div>

                {!adjusting && standing && standing.holesPlayed > 0 ? (
                  <p className="mt-2 text-xs text-muted">
                    Holes won {standing.teamAHolesWon}–{standing.teamBHolesWon}{" "}
                    · through {standing.holesPlayed}
                    {standing.finalResult
                      ? " · result locked from scores"
                      : ""}
                  </p>
                ) : null}

                {adjusting && isAdmin ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void deleteMatch(match.id)}
                    className="mt-3 text-sm text-danger"
                  >
                    Delete match
                  </button>
                ) : null}
              </li>
            );
          })
        )}
      </ul>

      {message ? <p className="mt-4 text-sm text-danger">{message}</p> : null}
    </section>
  );
}
