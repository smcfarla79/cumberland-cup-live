"use client";

import { useEffect, useMemo, useState, useEffectEvent } from "react";
import { TeamDraft } from "@/components/team-draft";
import { TeamSwatch } from "@/components/team-swatch";
import { createClient } from "@/lib/supabase/client";
import type { Player, Team, TeamAssignment } from "@/lib/types";

type TeamsTabProps = {
  tournamentId: string;
  players: Player[];
  teams: Team[];
  isAdmin: boolean;
  onPlayersChange: (players: Player[]) => void;
  onTeamsChange: (teams: Team[]) => void;
};

export function TeamsTab({
  tournamentId,
  players,
  teams,
  isAdmin,
  onPlayersChange,
  onTeamsChange,
}: TeamsTabProps) {
  const [assignments, setAssignments] = useState<TeamAssignment[]>([]);
  const [editing, setEditing] = useState(false);
  const [editingHandicaps, setEditingHandicaps] = useState(false);
  const [editingNames, setEditingNames] = useState(false);
  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [draftHandicaps, setDraftHandicaps] = useState<Record<string, string>>(
    {},
  );
  const [message, setMessage] = useState("");
  const [savingHcps, setSavingHcps] = useState(false);
  const [savingNames, setSavingNames] = useState(false);

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
    setMessage("");
  });

  useEffect(() => {
    void loadAssignments();
  }, [tournamentId, teams, editing]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const player of players) {
      next[player.id] =
        player.handicap == null ? "" : String(player.handicap);
    }
    setDraftHandicaps(next);
  }, [players, editingHandicaps]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const team of teams) {
      next[team.id] = team.name;
    }
    setDraftNames(next);
  }, [teams, editingNames]);

  const assignedIds = new Set(assignments.map((a) => a.player_id));
  const unassigned = players.filter((p) => !assignedIds.has(p.id));

  async function saveTeamNames() {
    setSavingNames(true);
    setMessage("");
    const supabase = createClient();
    const trimmed = Object.fromEntries(
      Object.entries(draftNames).map(([id, name]) => [id, name.trim()]),
    );

    for (const team of teams) {
      const name = trimmed[team.id] ?? "";
      if (!name) {
        setSavingNames(false);
        setMessage("Team names can’t be empty.");
        return;
      }
    }

    const values = Object.values(trimmed);
    if (new Set(values).size !== values.length) {
      setSavingNames(false);
      setMessage("Team names must be different from each other.");
      return;
    }

    for (const team of teams) {
      const name = trimmed[team.id];
      const { error } = await supabase
        .from("teams")
        .update({ name })
        .eq("id", team.id);
      if (error) {
        setSavingNames(false);
        setMessage(error.message);
        return;
      }
    }

    onTeamsChange(
      teams.map((team) => ({
        ...team,
        name: trimmed[team.id] ?? team.name,
      })),
    );
    setSavingNames(false);
    setEditingNames(false);
  }

  async function saveHandicaps() {
    setSavingHcps(true);
    setMessage("");
    const supabase = createClient();

    for (const player of players) {
      const raw = draftHandicaps[player.id]?.trim() ?? "";
      const handicap = raw === "" ? null : Number(raw);
      if (raw !== "" && (Number.isNaN(handicap) || handicap! < 0 || handicap! > 54)) {
        setSavingHcps(false);
        setMessage(`Invalid handicap for ${player.display_name}. Use 0–54.`);
        return;
      }

      const { error } = await supabase
        .from("tournament_players")
        .update({ handicap })
        .eq("tournament_id", tournamentId)
        .eq("player_id", player.id);

      if (error) {
        setSavingHcps(false);
        setMessage(error.message);
        return;
      }
    }

    onPlayersChange(
      players.map((player) => {
        const raw = draftHandicaps[player.id]?.trim() ?? "";
        return {
          ...player,
          handicap: raw === "" ? null : Number(raw),
        };
      }),
    );
    setSavingHcps(false);
    setEditingHandicaps(false);
  }

  if (editing) {
    return (
      <TeamDraft
        tournamentId={tournamentId}
        players={players}
        teams={teams}
        onBack={() => setEditing(false)}
      />
    );
  }

  return (
    <section className="mx-auto w-full max-w-2xl px-5 py-6">
      <div className="flex items-start justify-between gap-3 animate-rise">
        <div>
          <h1 className="font-display text-3xl text-ink">Teams</h1>
          <p className="mt-2 text-sm text-muted">
            Overall Cup sides after the draft.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          {isAdmin ? (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="border border-pine bg-pine px-3 py-2 text-sm font-semibold text-fog"
              >
                Edit draft
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingNames((v) => !v);
                  setEditingHandicaps(false);
                }}
                className="border border-mist bg-white px-3 py-2 text-sm font-semibold text-ink"
              >
                {editingNames ? "Close names" : "Rename teams"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingHandicaps((v) => !v);
                  setEditingNames(false);
                }}
                className="border border-mist bg-white px-3 py-2 text-sm font-semibold text-ink"
              >
                {editingHandicaps ? "Close handicaps" : "Set handicaps"}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {isAdmin && editingNames ? (
        <div className="mt-6 border border-mist bg-white p-4 animate-fade">
          <h2 className="text-sm font-semibold tracking-wide text-fairway uppercase">
            Team names
          </h2>
          <p className="mt-1 text-xs text-muted">
            Set these after the draft — they update everywhere in the app.
          </p>
          <ul className="mt-4 space-y-3">
            {sortedTeams.map((team) => (
              <li key={team.id} className="flex items-center gap-3">
                <TeamSwatch color={team.color} className="h-3 w-3" />
                <input
                  value={draftNames[team.id] ?? ""}
                  onChange={(e) =>
                    setDraftNames((prev) => ({
                      ...prev,
                      [team.id]: e.target.value,
                    }))
                  }
                  className="w-full border border-mist px-3 py-2 text-sm text-ink outline-none focus:border-fairway"
                  placeholder="Team name"
                  aria-label={`Name for ${team.name}`}
                />
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={savingNames}
            onClick={() => void saveTeamNames()}
            className="mt-4 w-full bg-pine px-4 py-3 text-sm font-semibold text-fog disabled:opacity-50"
          >
            {savingNames ? "Saving…" : "Save team names"}
          </button>
        </div>
      ) : null}

      {isAdmin && editingHandicaps ? (
        <div className="mt-6 border border-mist bg-white p-4 animate-fade">
          <h2 className="text-sm font-semibold tracking-wide text-fairway uppercase">
            Course handicaps
          </h2>
          <p className="mt-1 text-xs text-muted">
            Used for net scores and best ball. Stroke holes follow each hole’s
            handicap index.
          </p>
          <ul className="mt-4 space-y-2">
            {players.map((player) => (
              <li
                key={player.id}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-sm text-ink">{player.display_name}</span>
                <input
                  inputMode="numeric"
                  value={draftHandicaps[player.id] ?? ""}
                  onChange={(e) =>
                    setDraftHandicaps((prev) => ({
                      ...prev,
                      [player.id]: e.target.value,
                    }))
                  }
                  className="w-20 border border-mist px-2 py-1.5 text-right text-sm tabular-nums outline-none focus:border-fairway"
                  placeholder="—"
                  aria-label={`Handicap for ${player.display_name}`}
                />
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={savingHcps}
            onClick={() => void saveHandicaps()}
            className="mt-4 w-full bg-pine px-4 py-3 text-sm font-semibold text-fog disabled:opacity-50"
          >
            {savingHcps ? "Saving…" : "Save handicaps"}
          </button>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 animate-fade">
        {sortedTeams.map((team) => {
          const members = players
            .filter((p) =>
              assignments.some(
                (a) => a.team_id === team.id && a.player_id === p.id,
              ),
            )
            .sort((a, b) => a.display_name.localeCompare(b.display_name));

          return (
            <div key={team.id} className="border border-mist bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <TeamSwatch color={team.color} className="h-3 w-3" />
                  <h2 className="text-lg font-semibold text-ink">{team.name}</h2>
                </div>
                <span className="text-sm text-muted">{members.length}</span>
              </div>
              <ul className="mt-3 space-y-1.5">
                {members.length === 0 ? (
                  <li className="text-sm text-muted">No players yet</li>
                ) : (
                  members.map((player) => (
                    <li
                      key={player.id}
                      className="flex items-center justify-between gap-2 text-sm text-ink"
                    >
                      <span>{player.display_name}</span>
                      <span className="text-xs text-muted">
                        {player.handicap == null
                          ? "HCP —"
                          : `HCP ${player.handicap}`}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          );
        })}
      </div>

      {unassigned.length > 0 ? (
        <div className="mt-4 border border-mist bg-white p-4">
          <h2 className="text-sm font-semibold text-ink">
            Unassigned ({unassigned.length})
          </h2>
          <p className="mt-1 text-sm text-muted">
            {unassigned.map((p) => p.display_name).join(", ")}
          </p>
        </div>
      ) : null}

      {message ? <p className="mt-3 text-sm text-danger">{message}</p> : null}
    </section>
  );
}
