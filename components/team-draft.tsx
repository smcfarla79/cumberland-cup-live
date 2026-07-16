"use client";

import { useEffect, useMemo, useState, useEffectEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { TeamSwatch } from "@/components/team-swatch";
import type { Player, Team, TeamAssignment } from "@/lib/types";

const TEAM_CAPACITY = 10;

type TeamDraftProps = {
  tournamentId: string;
  players: Player[];
  teams: Team[];
  onBack: () => void;
};

export function TeamDraft({
  tournamentId,
  players,
  teams,
  onBack,
}: TeamDraftProps) {
  const [assignments, setAssignments] = useState<TeamAssignment[]>([]);
  const [busyPlayerId, setBusyPlayerId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.name.localeCompare(b.name)),
    [teams],
  );

  const loadAssignments = useEffectEvent(async () => {
    if (teams.length === 0) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("team_players")
      .select("team_id, player_id")
      .in(
        "team_id",
        teams.map((t) => t.id),
      );

    if (error) {
      setMessage(error.message);
      return;
    }
    setAssignments((data as TeamAssignment[]) ?? []);
  });

  useEffect(() => {
    void loadAssignments();
  }, [tournamentId, teams]);

  const assignedIds = new Set(assignments.map((a) => a.player_id));
  const unassigned = players.filter((p) => !assignedIds.has(p.id));

  function membersFor(teamId: string) {
    const ids = new Set(
      assignments.filter((a) => a.team_id === teamId).map((a) => a.player_id),
    );
    return players.filter((p) => ids.has(p.id));
  }

  async function assignPlayer(playerId: string, teamId: string) {
    const teamMembers = membersFor(teamId);
    if (teamMembers.length >= TEAM_CAPACITY) {
      setMessage(`That team already has ${TEAM_CAPACITY} players.`);
      return;
    }

    setBusyPlayerId(playerId);
    setMessage("");
    const supabase = createClient();

    // Remove from any current team in this tournament first
    const current = assignments.find((a) => a.player_id === playerId);
    if (current) {
      const { error: removeError } = await supabase
        .from("team_players")
        .delete()
        .eq("team_id", current.team_id)
        .eq("player_id", playerId);
      if (removeError) {
        setBusyPlayerId(null);
        setMessage(removeError.message);
        return;
      }
    }

    const { error } = await supabase.from("team_players").insert({
      team_id: teamId,
      player_id: playerId,
    });

    setBusyPlayerId(null);
    if (error) {
      setMessage(error.message);
      return;
    }

    setAssignments((prev) => [
      ...prev.filter((a) => a.player_id !== playerId),
      { team_id: teamId, player_id: playerId },
    ]);
  }

  async function unassignPlayer(playerId: string) {
    const current = assignments.find((a) => a.player_id === playerId);
    if (!current) return;

    setBusyPlayerId(playerId);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase
      .from("team_players")
      .delete()
      .eq("team_id", current.team_id)
      .eq("player_id", playerId);

    setBusyPlayerId(null);
    if (error) {
      setMessage(error.message);
      return;
    }

    setAssignments((prev) => prev.filter((a) => a.player_id !== playerId));
  }

  return (
    <section className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-8">
      <header className="animate-rise">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted hover:text-ink"
        >
          ← Back
        </button>
        <h1 className="font-display mt-3 text-4xl text-ink">Draft night</h1>
        <p className="mt-3 text-muted">
          Assign players after the draft. Two teams of {TEAM_CAPACITY}.
        </p>
      </header>

      <div className="mt-8 space-y-6 animate-fade">
        {sortedTeams.map((team) => {
          const members = membersFor(team.id);
          return (
            <div key={team.id} className="border border-mist bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <TeamSwatch color={team.color} className="h-3 w-3" />
                  <h2 className="text-lg font-semibold text-ink">{team.name}</h2>
                </div>
                <span className="text-sm text-muted">
                  {members.length}/{TEAM_CAPACITY}
                </span>
              </div>
              <ul className="mt-3 space-y-2">
                {members.length === 0 ? (
                  <li className="text-sm text-muted">No players yet</li>
                ) : (
                  members.map((player) => (
                    <li
                      key={player.id}
                      className="flex items-center justify-between gap-3 border border-mist px-3 py-2"
                    >
                      <span className="text-sm text-ink">
                        {player.display_name}
                      </span>
                      <button
                        type="button"
                        disabled={busyPlayerId === player.id}
                        onClick={() => void unassignPlayer(player.id)}
                        className="text-xs text-muted hover:text-danger disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          );
        })}

        <div className="border border-mist bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Unassigned</h2>
            <span className="text-sm text-muted">{unassigned.length}</span>
          </div>
          <ul className="mt-3 space-y-2">
            {unassigned.length === 0 ? (
              <li className="text-sm text-fairway">All players are on a team.</li>
            ) : (
              unassigned.map((player) => (
                <li
                  key={player.id}
                  className="border border-mist px-3 py-3"
                >
                  <p className="text-sm font-medium text-ink">
                    {player.display_name}
                  </p>
                  <div className="mt-2 flex gap-2">
                    {sortedTeams.map((team) => (
                      <button
                        key={team.id}
                        type="button"
                        disabled={
                          busyPlayerId === player.id ||
                          membersFor(team.id).length >= TEAM_CAPACITY
                        }
                        onClick={() => void assignPlayer(player.id, team.id)}
                        className="flex-1 border border-pine bg-pine px-2 py-2 text-xs font-semibold text-fog transition hover:brightness-110 disabled:opacity-40"
                      >
                        {team.name}
                      </button>
                    ))}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      {message ? (
        <p className="mt-4 text-sm text-danger" role="status">
          {message}
        </p>
      ) : (
        <p className="mt-4 text-sm text-muted">Changes save instantly.</p>
      )}
    </section>
  );
}
