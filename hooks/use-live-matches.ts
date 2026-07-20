"use client";

import { useEffect, useState, useEffectEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Match, MatchPlayer } from "@/lib/types";

export type MatchWithPlayers = Match & { players: MatchPlayer[] };
export type ScoresByRound = Record<string, Record<string, Record<number, number>>>;

/**
 * Polls matches + match_players + hole_scores for the given rounds every
 * `pollMs`. Shared by the Cup board and the Home "your match" shortcut so
 * they agree on the same data and the same "last updated" clock.
 */
export function useLiveMatches(roundIds: string[], pollMs = 8000) {
  const [matches, setMatches] = useState<MatchWithPlayers[]>([]);
  const [scoresByRound, setScoresByRound] = useState<ScoresByRound>({});
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [message, setMessage] = useState("");

  const refresh = useEffectEvent(async () => {
    if (roundIds.length === 0) {
      setMatches([]);
      setScoresByRound({});
      return;
    }
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
    const byRound: ScoresByRound = {};

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
    }, pollMs);
    return () => window.clearInterval(id);
    // roundIds is joined so a same-length-different-order array doesn't loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundIds.join(","), pollMs]);

  return { matches, scoresByRound, updatedAt, message, refresh };
}
