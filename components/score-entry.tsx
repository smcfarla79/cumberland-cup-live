"use client";

import { useEffect, useMemo, useState, useEffectEvent } from "react";
import {
  holesForRound,
  nineCaption,
  physicalHoleNumber,
} from "@/lib/course-holes";
import {
  bestBallNet,
  formatLabel,
  netScore,
  resolvePlayFormat,
  strokesReceivedOnHole,
  toParLabel,
} from "@/lib/scoring";
import { createClient } from "@/lib/supabase/client";
import type { Hole, HoleScore, Player, Round } from "@/lib/types";

type ScoreEntryProps = {
  round: Round;
  playerId: string;
  playerName: string;
  playerHandicap: number | null;
  holes: Hole[];
  players: Player[];
  isAdminEdit?: boolean;
  onBack: () => void;
};

export function ScoreEntry({
  round,
  playerId,
  playerName,
  playerHandicap,
  holes,
  players,
  isAdminEdit = false,
  onBack,
}: ScoreEntryProps) {
  const format = resolvePlayFormat(round);
  const roundHoles = useMemo(
    () => holesForRound(round, holes),
    [round, holes],
  );
  const firstHole = roundHoles[0]?.hole_number ?? 1;

  const [scores, setScores] = useState<Record<number, number>>({});
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerScores, setPartnerScores] = useState<Record<number, number>>(
    {},
  );
  const [activeHole, setActiveHole] = useState(firstHole);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const partner = players.find((p) => p.id === partnerId) ?? null;

  const loadScores = useEffectEvent(async () => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("hole_scores")
      .select("hole_number, strokes")
      .eq("round_id", round.id)
      .eq("player_id", playerId);

    if (error) {
      setMessage(error.message);
      return;
    }

    const next: Record<number, number> = {};
    (data as Pick<HoleScore, "hole_number" | "strokes">[] | null)?.forEach(
      (row) => {
        next[row.hole_number] = row.strokes;
      },
    );
    setScores(next);

    // Find 2-man partner from match lineup for this round
    const { data: myMatchRows } = await supabase
      .from("match_players")
      .select("match_id, team_id")
      .eq("player_id", playerId);

    const matchIds = (myMatchRows ?? []).map((r) => r.match_id as string);
    let foundPartner: string | null = null;

    if (matchIds.length > 0) {
      const { data: roundMatches } = await supabase
        .from("matches")
        .select("id")
        .eq("round_id", round.id)
        .in("id", matchIds);

      const roundMatchId = roundMatches?.[0]?.id as string | undefined;
      if (roundMatchId) {
        const myTeam = (myMatchRows ?? []).find(
          (r) => r.match_id === roundMatchId,
        )?.team_id as string | undefined;

        const { data: side } = await supabase
          .from("match_players")
          .select("player_id, team_id")
          .eq("match_id", roundMatchId);

        const partnerRow = (side ?? []).find(
          (row) =>
            row.team_id === myTeam &&
            row.player_id !== playerId,
        );
        foundPartner = (partnerRow?.player_id as string | undefined) ?? null;
      }
    }

    setPartnerId(foundPartner);

    if (foundPartner) {
      const { data: partnerData } = await supabase
        .from("hole_scores")
        .select("hole_number, strokes")
        .eq("round_id", round.id)
        .eq("player_id", foundPartner);

      const partnerNext: Record<number, number> = {};
      (partnerData as Pick<HoleScore, "hole_number" | "strokes">[] | null)?.forEach(
        (row) => {
          partnerNext[row.hole_number] = row.strokes;
        },
      );
      setPartnerScores(partnerNext);
    } else {
      setPartnerScores({});
    }

    setMessage("");
  });

  useEffect(() => {
    setActiveHole(firstHole);
    void loadScores();
  }, [round.id, playerId, firstHole]);

  const hole =
    roundHoles.find((h) => h.hole_number === activeHole) ?? roundHoles[0];
  const currentStrokes = scores[activeHole];
  const total = Object.values(scores).reduce((sum, n) => sum + n, 0);
  const holesPlayed = Object.keys(scores).length;
  const activeIndex = roundHoles.findIndex((h) => h.hole_number === activeHole);

  const strokesGot = hole
    ? strokesReceivedOnHole(playerHandicap, hole.handicap_index)
    : 0;
  const myNet =
    currentStrokes != null && hole
      ? netScore(currentStrokes, playerHandicap, hole.handicap_index)
      : null;

  const partnerGross = partner ? partnerScores[activeHole] : undefined;
  const partnerNet =
    partner && partnerGross != null && hole
      ? netScore(partnerGross, partner.handicap, hole.handicap_index)
      : null;
  const partnerStrokesGot = hole
    ? strokesReceivedOnHole(partner?.handicap, hole.handicap_index)
    : 0;

  const teamBest =
    format === "best_ball" ? bestBallNet([myNet, partnerNet]) : null;

  async function saveStrokes(strokes: number) {
    if (!hole) return;
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

    setScores((prev) => ({ ...prev, [activeHole]: strokes }));
  }

  function bump(delta: number) {
    if (!hole) return;
    const base = currentStrokes ?? hole.par;
    const next = Math.min(15, Math.max(1, base + delta));
    void saveStrokes(next);
  }

  function goRelative(delta: number) {
    const next = roundHoles[activeIndex + delta];
    if (next) setActiveHole(next.hole_number);
  }

  const physical = hole ? physicalHoleNumber(hole.hole_number) : null;
  const isBackTee = hole ? hole.hole_number >= 10 : false;

  return (
    <section className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-8">
      <header className="animate-rise">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-mist bg-white/70 px-3 py-1.5 text-xs font-medium text-muted transition hover:border-fairway/40 hover:text-ink"
        >
          ← All rounds
        </button>
        <h1 className="font-display mt-3 text-3xl text-ink">
          {isAdminEdit ? "Admin scoring" : "Your scorecard"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {playerName}
          {playerHandicap != null ? ` · HCP ${playerHandicap}` : " · no HCP set"}
          {" · "}
          {formatLabel(format)}
        </p>
        <p className="mt-1 text-xs text-muted">
          {nineCaption(round)} · {round.name}
        </p>
      </header>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-2 animate-fade">
        {roundHoles.map((h) => {
          const scored = scores[h.hole_number] != null;
          const isActive = h.hole_number === activeHole;
          return (
            <button
              key={h.id}
              type="button"
              onClick={() => setActiveHole(h.hole_number)}
              className={[
                "flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-full border text-xs transition-all duration-150",
                isActive
                  ? "border-pine bg-pine text-fog shadow-[0_2px_8px_rgba(12,31,24,0.35)]"
                  : scored
                    ? "border-fairway bg-white text-ink"
                    : "border-mist bg-white text-muted hover:border-fairway/40",
              ].join(" ")}
            >
              <span>{h.hole_number}</span>
              {scored ? (
                <span className="text-[10px] opacity-80">
                  {scores[h.hole_number]}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {hole ? (
        <div className="mt-6 rounded-3xl border border-mist bg-white p-6 shadow-[0_10px_30px_rgba(20,32,27,0.1)] animate-rise">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs tracking-[0.18em] text-fairway uppercase">
                Scorecard hole {hole.hole_number}
              </p>
              <p className="mt-2 text-sm text-ink">
                Physical hole {physical}
                {isBackTee ? " · back tees" : " · front tees"}
              </p>
              <p className="mt-2 text-sm text-muted">
                Par {hole.par}
                {hole.handicap_index != null
                  ? ` · Stroke index ${hole.handicap_index}`
                  : ""}
                {hole.yards ? ` · ${hole.yards} yds White` : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted">Gross</p>
              <p className="font-display text-5xl text-ink">
                {currentStrokes ?? "—"}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-mist bg-fog px-4 py-3 text-sm">
            <div>
              <p className="text-xs text-muted">Strokes received</p>
              <p className="font-semibold text-ink">
                {strokesGot > 0 ? `−${strokesGot}` : "0"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Your net</p>
              <p className="font-semibold text-ink">
                {myNet == null
                  ? "—"
                  : `${myNet} · ${toParLabel(myNet, hole.par)}`}
              </p>
            </div>
          </div>

          {format === "best_ball" ? (
            <div className="mt-3 rounded-2xl border border-pine/30 bg-pine/5 px-4 py-3 text-sm">
              <p className="text-xs tracking-wide text-fairway uppercase">
                Best ball (net)
              </p>
              {partner ? (
                <>
                  <p className="mt-2 text-ink">
                    Partner: {partner.display_name}
                    {partner.handicap != null
                      ? ` (HCP ${partner.handicap})`
                      : ""}
                  </p>
                  <p className="mt-1 text-muted">
                    Partner gross {partnerGross ?? "—"}
                    {partnerGross != null
                      ? ` · strokes ${partnerStrokesGot > 0 ? `−${partnerStrokesGot}` : "0"} · net ${partnerNet}`
                      : " · waiting for score"}
                    {partnerNet != null
                      ? ` · ${toParLabel(partnerNet, hole.par)}`
                      : ""}
                  </p>
                  <p className="mt-2 font-semibold text-ink">
                    Team hole:{" "}
                    {teamBest == null
                      ? "—"
                      : `${teamBest} · ${toParLabel(teamBest, hole.par)}`}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-muted">
                  No match partner found for this session yet. Set the lineup on
                  Matches, then both players enter scores — best ball uses the
                  lower net.
                </p>
              )}
            </div>
          ) : null}

          <div className="mt-8 grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => bump(-1)}
              disabled={saving}
              className="rounded-xl border border-mist py-4 text-2xl text-ink shadow-sm transition hover:bg-fog active:scale-[0.97] disabled:opacity-50"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => void saveStrokes(hole.par)}
              disabled={saving}
              className="rounded-xl border border-pine bg-pine py-4 text-sm font-semibold tracking-wide text-fog shadow-[0_2px_8px_rgba(12,31,24,0.3)] transition hover:brightness-110 active:scale-[0.97] disabled:opacity-50"
            >
              Set par
            </button>
            <button
              type="button"
              onClick={() => bump(1)}
              disabled={saving}
              className="rounded-xl border border-mist py-4 text-2xl text-ink shadow-sm transition hover:bg-fog active:scale-[0.97] disabled:opacity-50"
            >
              +
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={activeIndex <= 0}
              onClick={() => goRelative(-1)}
              className="rounded-xl border border-mist py-3 text-sm text-ink transition hover:bg-fog disabled:opacity-40"
            >
              Prev hole
            </button>
            <button
              type="button"
              disabled={activeIndex >= roundHoles.length - 1}
              onClick={() => goRelative(1)}
              className="rounded-xl border border-mist py-3 text-sm text-ink transition hover:bg-fog disabled:opacity-40"
            >
              Next hole
            </button>
          </div>
        </div>
      ) : null}

      <footer className="mt-6 flex items-center justify-between text-sm text-muted">
        <span>
          {holesPlayed}/{roundHoles.length} holes · gross {total || "—"}
        </span>
        <span>{saving ? "Saving…" : message || "Saved to cloud"}</span>
      </footer>
    </section>
  );
}
