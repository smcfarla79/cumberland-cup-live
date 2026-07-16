"use client";

import { useEffect, useMemo, useState, useEffectEvent } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { createClient } from "@/lib/supabase/client";
import { TeamSwatch } from "@/components/team-swatch";
import type { Player, Round, Team, TeamAssignment } from "@/lib/types";

type LiveBoardProps = {
  tournamentId: string;
  players: Player[];
  teams: Team[];
  rounds: Round[];
  onBack: () => void;
};

type ScoreRow = {
  player_id: string;
  hole_number: number;
  strokes: number;
};

type PlayerRoundStat = {
  player: Player;
  holesPlayed: number;
  total: number;
};

export function LiveBoard({
  tournamentId,
  players,
  teams,
  rounds,
  onBack,
}: LiveBoardProps) {
  const [assignments, setAssignments] = useState<TeamAssignment[]>([]);
  const [scores, setScores] = useState<ScoreRow[]>([]);
  const [roundId, setRoundId] = useState(rounds[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.name.localeCompare(b.name)),
    [teams],
  );

  const activeRound = rounds.find((r) => r.id === roundId) ?? rounds[0];

  const refresh = useEffectEvent(async () => {
    if (!activeRound || teams.length === 0) return;
    const supabase = createClient();

    const [{ data: assignmentRows, error: assignmentError }, { data: scoreRows, error: scoreError }] =
      await Promise.all([
        supabase
          .from("team_players")
          .select("team_id, player_id")
          .in(
            "team_id",
            teams.map((t) => t.id),
          ),
        supabase
          .from("hole_scores")
          .select("player_id, hole_number, strokes")
          .eq("round_id", activeRound.id),
      ]);

    if (assignmentError || scoreError) {
      setMessage(assignmentError?.message ?? scoreError?.message ?? "Could not load board.");
      return;
    }

    setAssignments((assignmentRows as TeamAssignment[]) ?? []);
    setScores((scoreRows as ScoreRow[]) ?? []);
    setUpdatedAt(new Date());
    setMessage("");
  });

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      void refresh();
    }, 8000);
    return () => window.clearInterval(id);
  }, [tournamentId, roundId, teams]);

  function statsForTeam(teamId: string): PlayerRoundStat[] {
    const memberIds = new Set(
      assignments.filter((a) => a.team_id === teamId).map((a) => a.player_id),
    );
    return players
      .filter((p) => memberIds.has(p.id))
      .map((player) => {
        const playerScores = scores.filter((s) => s.player_id === player.id);
        return {
          player,
          holesPlayed: playerScores.length,
          total: playerScores.reduce((sum, s) => sum + s.strokes, 0),
        };
      })
      .sort((a, b) => {
        if (b.holesPlayed !== a.holesPlayed) return b.holesPlayed - a.holesPlayed;
        if (a.holesPlayed === 0) return a.player.display_name.localeCompare(b.player.display_name);
        return a.total - b.total;
      });
  }

  const assignedIds = new Set(assignments.map((a) => a.player_id));
  const unassignedCount = players.filter((p) => !assignedIds.has(p.id)).length;

  return (
    <section className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 py-8">
      <header className="animate-rise">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted hover:text-ink"
        >
          ← Back to rounds
        </button>
        <div className="mt-4 flex items-center gap-3">
          <BrandLogo size={56} className="shrink-0 ring-1 ring-mist" />
          <div>
            <h1 className="font-display text-4xl text-ink">Live board</h1>
            <p className="mt-1 text-muted">
              Stroke totals refresh every few seconds.
            </p>
          </div>
        </div>
      </header>

      <label className="mt-6 block animate-fade">
        <span className="mb-2 block text-sm text-muted">Round</span>
        <select
          value={activeRound?.id ?? ""}
          onChange={(e) => setRoundId(e.target.value)}
          className="w-full border border-mist bg-white px-3 py-3 text-ink outline-none focus:border-fairway"
        >
          {rounds.map((round) => (
            <option key={round.id} value={round.id}>
              {round.name}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 animate-fade">
        {sortedTeams.map((team) => {
          const stats = statsForTeam(team.id);
          const teamTotal = stats.reduce((sum, s) => sum + s.total, 0);
          const holesIn = stats.reduce((sum, s) => sum + s.holesPlayed, 0);

          return (
            <div key={team.id} className="border border-mist bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <TeamSwatch color={team.color} className="h-3 w-3" />
                  <h2 className="text-lg font-semibold text-ink">{team.name}</h2>
                </div>
                <div className="text-right">
                  <p className="font-display text-3xl text-ink">{teamTotal || "—"}</p>
                  <p className="text-xs text-muted">{holesIn} holes in</p>
                </div>
              </div>

              <ul className="mt-4 space-y-2">
                {stats.length === 0 ? (
                  <li className="text-sm text-muted">No players assigned yet</li>
                ) : (
                  stats.map(({ player, holesPlayed, total }) => (
                    <li
                      key={player.id}
                      className="flex items-center justify-between gap-3 border-t border-mist pt-2 text-sm"
                    >
                      <span className="text-ink">{player.display_name}</span>
                      <span className="tabular-nums text-muted">
                        {holesPlayed === 0
                          ? "—"
                          : `${total} · thru ${holesPlayed}`}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          );
        })}
      </div>

      <footer className="mt-6 flex items-center justify-between gap-3 text-sm text-muted">
        <span>
          {unassignedCount > 0
            ? `${unassignedCount} player${unassignedCount === 1 ? "" : "s"} still unassigned`
            : "All players assigned"}
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
      </footer>
      {message ? <p className="mt-2 text-sm text-danger">{message}</p> : null}
    </section>
  );
}
