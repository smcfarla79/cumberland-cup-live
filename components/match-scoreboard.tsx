"use client";

import { useEffect, useMemo, useRef, useState, useEffectEvent } from "react";
import { SavedBadge } from "@/components/saved-badge";
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
import { teamAccentColor } from "@/lib/team-colors";
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
  const shareTeamScore = format === "scramble";
  const roundHoles = useMemo(() => holesForRound(round, holes), [round, holes]);
  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.name.localeCompare(b.name)),
    [teams],
  );
  const [teamA, teamB] = sortedTeams;

  const sideA = match.players.filter((p) => p.team_id === teamA?.id);
  const sideB = match.players.filter((p) => p.team_id === teamB?.id);
  const orphaned = match.players.filter(
    (p) => p.team_id !== teamA?.id && p.team_id !== teamB?.id,
  );
  const allPlayerIds = match.players.map((p) => p.player_id);

  const [scoresByPlayer, setScoresByPlayer] = useState<
    Record<string, Record<number, number>>
  >({});
  const [activeHole, setActiveHole] = useState(
    roundHoles[0]?.hole_number ?? 1,
  );
  const [message, setMessage] = useState("");
  const [savingPlayerId, setSavingPlayerId] = useState<string | null>(null);
  const [savedPlayerId, setSavedPlayerId] = useState<string | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sessionPlayer = players.find((p) => p.id === sessionPlayerId) ?? null;

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

  useEffect(() => {
    return () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    };
  }, []);

  const hole =
    roundHoles.find((h) => h.hole_number === activeHole) ?? roundHoles[0];

  function canEditPlayer(playerId: string) {
    if (isAdmin) return true;
    if (playerId === sessionPlayerId) return true;
    const mySide = match.players.find((p) => p.player_id === sessionPlayerId);
    const theirSide = match.players.find((p) => p.player_id === playerId);
    return Boolean(
      mySide && theirSide && mySide.team_id === theirSide.team_id,
    );
  }

  /** Same-side partner(s) — scramble copies the hole score to them. */
  function partnerIdsOnSide(playerId: string) {
    const me = match.players.find((p) => p.player_id === playerId);
    if (!me) return [];
    return match.players
      .filter((p) => p.team_id === me.team_id && p.player_id !== playerId)
      .map((p) => p.player_id);
  }

  async function saveStrokes(playerId: string, strokes: number) {
    if (!canEditPlayer(playerId) || !hole) {
      setMessage("You don’t have permission to edit that player.");
      return;
    }
    setSavingPlayerId(playerId);
    setMessage("");

    const targets = shareTeamScore
      ? [playerId, ...partnerIdsOnSide(playerId)]
      : [playerId];

    // Optimistic UI so both scramble partners update immediately
    setScoresByPlayer((prev) => {
      const next = { ...prev };
      for (const id of targets) {
        next[id] = { ...(next[id] ?? {}), [activeHole]: strokes };
      }
      return next;
    });

    const supabase = createClient();
    const now = new Date().toISOString();
    const { error } = await supabase.from("hole_scores").upsert(
      targets.map((id) => ({
        round_id: round.id,
        player_id: id,
        hole_number: activeHole,
        strokes,
        updated_at: now,
      })),
      { onConflict: "round_id,player_id,hole_number" },
    );
    setSavingPlayerId(null);

    if (error) {
      setMessage(error.message);
      await loadScores();
      return;
    }

    setSavedPlayerId(playerId);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSavedPlayerId(null), 1400);
  }

  function bump(playerId: string, delta: number) {
    if (!hole) return;
    const current = scoresByPlayer[playerId]?.[activeHole];
    const base = current ?? hole.par;
    const next = Math.min(15, Math.max(1, base + delta));
    void saveStrokes(playerId, next);
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
      <div className="rounded-2xl border border-mist bg-white p-3.5 shadow-[0_6px_20px_rgba(20,32,27,0.07)]">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p
            className="text-sm font-semibold"
            style={{
              color: teamAccentColor(
                team.color,
                team.id === teamA?.id ? "gold" : "green",
              ),
            }}
          >
            {team.name}
          </p>
          {best != null ? (
            <p className="text-xs font-semibold text-fairway">
              Best ball {best} · {toParLabel(best, hole.par)}
            </p>
          ) : shareTeamScore ? (
            <p className="text-xs font-semibold text-fairway">Team score</p>
          ) : null}
        </div>
        <ul className="space-y-3">
          {nets.map(({ mp, player, gross, net }) => {
            const editable = canEditPlayer(mp.player_id);
            const saving = savingPlayerId === mp.player_id;
            const strokesGot = strokesReceivedOnHole(
              player?.handicap,
              hole.handicap_index,
            );
            const isYou = mp.player_id === sessionPlayerId;
            const nameColor = teamAccentColor(
              team.color,
              team.id === teamA?.id ? "gold" : "green",
            );
            return (
              <li
                key={mp.player_id}
                className={[
                  "rounded-xl border px-3 py-3",
                  editable ? "border-mist bg-fog/40" : "border-mist/60 bg-fog/20",
                  isYou ? "ring-2 ring-fairway/40" : "",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p
                      className="text-sm font-medium"
                      style={{ color: nameColor }}
                    >
                      {player?.display_name ?? "Unknown"}
                      {isYou ? " · you" : ""}
                      {player?.handicap != null ? ` · HCP ${player.handicap}` : ""}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {strokesGot > 0
                        ? `Stroke hole (−${strokesGot})`
                        : "No stroke"}
                      {net != null
                        ? ` · net ${net} · ${toParLabel(net, hole.par)}`
                        : ""}
                      {!editable ? " · view only" : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="font-display text-3xl tabular-nums text-ink">
                      {gross ?? "—"}
                    </p>
                    {savedPlayerId === mp.player_id ? <SavedBadge /> : null}
                  </div>
                </div>

                {editable ? (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => bump(mp.player_id, -1)}
                      className="rounded-xl border border-mist bg-white py-4 text-2xl text-ink shadow-sm transition hover:border-fairway/40 active:scale-[0.97] disabled:opacity-50"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void saveStrokes(mp.player_id, hole.par)}
                      className="rounded-xl border border-pine bg-pine py-4 text-sm font-semibold text-fog shadow-[0_2px_8px_rgba(12,31,24,0.3)] transition hover:brightness-110 active:scale-[0.97] disabled:opacity-50"
                    >
                      Par
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => bump(mp.player_id, 1)}
                      className="rounded-xl border border-mist bg-white py-4 text-2xl text-ink shadow-sm transition hover:border-fairway/40 active:scale-[0.97] disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <section className="mx-auto w-full max-w-2xl px-5 py-6 pb-16">
      <button
        type="button"
        onClick={onBack}
        className="rounded-full border border-mist bg-white/70 px-3 py-1.5 text-xs font-medium text-muted transition hover:border-fairway/40 hover:text-ink"
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
        Signed in as {sessionPlayer?.display_name ?? "Unknown"}
        {isAdmin ? " · admin" : ""}
        {shareTeamScore
          ? " — one score updates both partners"
          : isAdmin
            ? " — use − / + under any player"
            : " — you can edit your row and your partner’s"}
      </p>

      <div
        className="scroll-fade-x mt-5 flex gap-2 overflow-x-auto pb-2"
        data-swipe-ignore
      >
        {roundHoles.map((h) => {
          const isActive = h.hole_number === activeHole;
          return (
            <button
              key={h.id}
              type="button"
              onClick={() => setActiveHole(h.hole_number)}
              className={[
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-sm font-medium tabular-nums transition-all duration-150",
                isActive
                  ? "border-pine bg-pine text-fog shadow-[0_2px_8px_rgba(12,31,24,0.35)]"
                  : "border-mist bg-white text-ink hover:border-fairway/40",
              ].join(" ")}
            >
              {h.hole_number}
            </button>
          );
        })}
      </div>

      {hole ? (
        <div className="mt-4 rounded-2xl border border-mist bg-white px-4 py-3 text-sm text-muted shadow-[0_4px_14px_rgba(20,32,27,0.06)]">
          Hole {hole.hole_number} · Par {hole.par}
          {hole.handicap_index != null
            ? ` · Stroke index ${hole.handicap_index}`
            : ""}
          {shareTeamScore ? " · scramble: shared team score" : ""}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {sideBlock(sideA, teamA)}
        {sideBlock(sideB, teamB)}
      </div>

      {orphaned.length > 0 ? (
        <div className="mt-3 rounded-2xl border border-danger/40 bg-white p-3.5 shadow-[0_4px_14px_rgba(20,32,27,0.06)]">
          <p className="text-sm font-semibold text-danger">
            Players missing a team on this match
          </p>
          <ul className="mt-2 space-y-2 text-sm text-ink">
            {orphaned.map((mp) => (
              <li key={mp.player_id}>
                {playerName(players, mp.player_id)} — fix lineup on Matches
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {message ? <p className="mt-3 text-sm text-danger">{message}</p> : null}

      <div
        className="scroll-fade-x mt-6 overflow-x-auto rounded-2xl border border-mist bg-white shadow-[0_6px_20px_rgba(20,32,27,0.07)]"
        data-swipe-ignore
      >
        <table className="w-full min-w-[520px] border-collapse text-sm">
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
                      {gross == null
                        ? "—"
                        : net != null && net !== gross
                          ? `${gross}/${net}`
                          : gross}
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
