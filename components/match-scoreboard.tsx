"use client";

import { useEffect, useMemo, useState, useEffectEvent } from "react";
import { holesForRound } from "@/lib/course-holes";
import {
  bestBallNet,
  formatLabel,
  netScore,
  resolvePlayFormat,
  strokesReceivedOnHole,
  toParLabel,
} from "@/lib/scoring";
import { createClient } from "@/lib/supabase/client";
import type {
  Hole,
  HoleScore,
  Match,
  MatchPlayer,
  Player,
  Round,
  Team,
} from "@/lib/types";

type MatchScoreboardProps = {
  round: Round;
  match: Match & { players: MatchPlayer[] };
  holes: Hole[];
  players: Player[];
  teams: Team[];
  sessionPlayerId: string;
  isAdmin: boolean;
  onBack: () => void;
};

function playerName(players: Player[], id: string) {
  return players.find((p) => p.id === id)?.display_name ?? "Unknown";
}

function shortName(name: string) {
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0];
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
}

export function MatchScoreboard({
  round,
  match,
  holes,
  players,
  teams,
  sessionPlayerId,
  isAdmin,
  onBack,
}: MatchScoreboardProps) {
  const format = resolvePlayFormat(round);
  const roundHoles = useMemo(() => holesForRound(round, holes), [round, holes]);
  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.name.localeCompare(b.name)),
    [teams],
  );
  const [teamA, teamB] = sortedTeams;

  const sideA = match.players.filter((p) => p.team_id === teamA?.id);
  const sideB = match.players.filter((p) => p.team_id === teamB?.id);
  const allPlayerIds = match.players.map((p) => p.player_id);

  const [scoresByPlayer, setScoresByPlayer] = useState<
    Record<string, Record<number, number>>
  >({});
  const [activeHole, setActiveHole] = useState(
    roundHoles[0]?.hole_number ?? 1,
  );
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const loadScores = useEffectEvent(async () => {
    if (allPlayerIds.length === 0) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("hole_scores")
      .select("player_id, hole_number, strokes")
      .eq("round_id", round.id)
      .in("player_id", allPlayerIds);

    if (error) {
      setMessage(error.message);
      return;
    }

    const next: Record<string, Record<number, number>> = {};
    for (const id of allPlayerIds) next[id] = {};
    (data as (HoleScore & { player_id: string })[] | null)?.forEach((row) => {
      if (!next[row.player_id]) next[row.player_id] = {};
      next[row.player_id][row.hole_number] = row.strokes;
    });
    setScoresByPlayer(next);
    setMessage("");
  });

  useEffect(() => {
    void loadScores();
  }, [round.id, match.id]);

  const hole =
    roundHoles.find((h) => h.hole_number === activeHole) ?? roundHoles[0];

  function canEdit(playerId: string) {
    if (isAdmin) return true;
    if (playerId === sessionPlayerId) return true;
    const mySide = match.players.find((p) => p.player_id === sessionPlayerId);
    const theirSide = match.players.find((p) => p.player_id === playerId);
    // Partners on the same match side can enter each other's scores
    return Boolean(
      mySide && theirSide && mySide.team_id === theirSide.team_id,
    );
  }

  async function saveStrokes(playerId: string, strokes: number) {
    if (!canEdit(playerId) || !hole) return;
    setSaving(true);
    setMessage("");
    const supabase = createClient();
    const { error } = await supabase.from("hole_scores").upsert(
      {
        round_id: round.id,
        player_id: playerId,
        hole_number: activeHole,
        strokes,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "round_id,player_id,hole_number" },
    );
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setScoresByPlayer((prev) => ({
      ...prev,
      [playerId]: { ...(prev[playerId] ?? {}), [activeHole]: strokes },
    }));
  }

  function sideBlock(side: MatchPlayer[], team: Team | undefined) {
    if (!team || !hole) return null;
    const nets = side.map((mp) => {
      const player = players.find((p) => p.id === mp.player_id);
      const gross = scoresByPlayer[mp.player_id]?.[activeHole];
      const net =
        gross == null
          ? null
          : netScore(gross, player?.handicap ?? null, hole.handicap_index);
      return { mp, player, gross, net };
    });
    const best =
      format === "best_ball"
        ? bestBallNet(nets.map((n) => n.net))
        : null;

    return (
      <div className="border border-mist bg-white p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink">{team.name}</p>
          {best != null ? (
            <p className="text-xs font-semibold text-fairway">
              Best ball {best} · {toParLabel(best, hole.par)}
            </p>
          ) : null}
        </div>
        <ul className="space-y-2">
          {nets.map(({ mp, player, gross, net }) => {
            const editable = canEdit(mp.player_id);
            const selected = editingPlayerId === mp.player_id;
            const strokesGot = strokesReceivedOnHole(
              player?.handicap,
              hole.handicap_index,
            );
            return (
              <li key={mp.player_id}>
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() =>
                    editable ? setEditingPlayerId(mp.player_id) : undefined
                  }
                  className={[
                    "w-full px-3 py-2.5 text-left",
                    editable
                      ? selected
                        ? "bg-pine text-fog"
                        : "border border-mist hover:border-fairway"
                      : "border border-mist bg-fog/50 opacity-90",
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      {player?.display_name ?? "Unknown"}
                      {player?.handicap != null ? ` · HCP ${player.handicap}` : ""}
                    </span>
                    <span className="text-sm tabular-nums">
                      {gross ?? "—"}
                      {net != null ? ` → net ${net}` : ""}
                    </span>
                  </div>
                  <p
                    className={[
                      "mt-1 text-xs",
                      selected ? "text-mist/80" : "text-muted",
                    ].join(" ")}
                  >
                    {strokesGot > 0 ? `Stroke hole (−${strokesGot})` : "No stroke"}
                    {net != null ? ` · ${toParLabel(net, hole.par)}` : ""}
                    {!editable ? " · view only" : selected ? " · editing" : " · tap to edit"}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  const editingPlayer = editingPlayerId
    ? players.find((p) => p.id === editingPlayerId)
    : null;
  const editingGross =
    editingPlayerId != null
      ? scoresByPlayer[editingPlayerId]?.[activeHole]
      : undefined;

  return (
    <section className="mx-auto w-full max-w-2xl px-5 py-6">
      <button
        type="button"
        onClick={onBack}
        className="text-sm text-muted hover:text-ink"
      >
        ← All matches
      </button>
      <h1 className="font-display mt-3 text-3xl text-ink">
        Match {match.match_number}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {formatLabel(format)} · {round.name}
      </p>
      <p className="mt-1 text-xs text-muted">
        {isAdmin
          ? "Admin: tap any player, then set the hole score."
          : "You and your partner can enter scores for each other. Opponents are view only."}
      </p>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
        {roundHoles.map((h) => {
          const isActive = h.hole_number === activeHole;
          return (
            <button
              key={h.id}
              type="button"
              onClick={() => {
                setActiveHole(h.hole_number);
                setEditingPlayerId(null);
              }}
              className={[
                "flex h-10 w-10 shrink-0 items-center justify-center border text-xs tabular-nums",
                isActive
                  ? "border-pine bg-pine text-fog"
                  : "border-mist bg-white text-ink",
              ].join(" ")}
            >
              {h.hole_number}
            </button>
          );
        })}
      </div>

      {hole ? (
        <div className="mt-4 border border-mist bg-white px-4 py-3 text-sm text-muted">
          Hole {hole.hole_number} · Par {hole.par}
          {hole.handicap_index != null
            ? ` · Stroke index ${hole.handicap_index}`
            : ""}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {sideBlock(sideA, teamA)}
        {sideBlock(sideB, teamB)}
      </div>

      {editingPlayer && hole && canEdit(editingPlayer.id) ? (
        <div className="mt-4 border border-pine bg-white p-4">
          <p className="text-sm font-semibold text-ink">
            Editing {editingPlayer.display_name} · Hole {hole.hole_number}
          </p>
          <p className="mt-1 text-xs text-muted">
            Current gross: {editingGross ?? "—"}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                const base = editingGross ?? hole.par;
                void saveStrokes(
                  editingPlayer.id,
                  Math.max(1, base - 1),
                );
              }}
              className="border border-mist py-4 text-2xl text-ink disabled:opacity-50"
            >
              −
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveStrokes(editingPlayer.id, hole.par)}
              className="border border-pine bg-pine py-4 text-sm font-semibold text-fog disabled:opacity-50"
            >
              Set par
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                const base = editingGross ?? hole.par;
                void saveStrokes(
                  editingPlayer.id,
                  Math.min(15, base + 1),
                );
              }}
              className="border border-mist py-4 text-2xl text-ink disabled:opacity-50"
            >
              +
            </button>
          </div>
        </div>
      ) : null}

      {message ? <p className="mt-3 text-sm text-danger">{message}</p> : null}
      {saving ? <p className="mt-2 text-sm text-muted">Saving…</p> : null}

      <div className="mt-6 overflow-x-auto border border-mist bg-white">
        <table className="w-full min-w-[520px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-mist bg-fog text-muted">
              <th className="px-2 py-2 text-left font-medium">Player</th>
              {roundHoles.map((h) => (
                <th
                  key={h.id}
                  className="px-1 py-2 text-center font-medium tabular-nums"
                >
                  {h.hole_number}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {match.players.map((mp) => (
              <tr key={mp.player_id} className="border-b border-mist/80">
                <td className="px-2 py-2 text-ink">
                  {shortName(playerName(players, mp.player_id))}
                </td>
                {roundHoles.map((h) => {
                  const gross = scoresByPlayer[mp.player_id]?.[h.hole_number];
                  const player = players.find((p) => p.id === mp.player_id);
                  const net =
                    gross == null
                      ? null
                      : netScore(
                          gross,
                          player?.handicap ?? null,
                          h.handicap_index,
                        );
                  return (
                    <td
                      key={`${mp.player_id}-${h.hole_number}`}
                      className="px-1 py-2 text-center tabular-nums text-ink"
                    >
                      {gross == null ? "—" : net != null && net !== gross ? `${gross}/${net}` : gross}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-muted">
        Grid shows gross, or gross/net when a stroke applies.
      </p>
    </section>
  );
}
