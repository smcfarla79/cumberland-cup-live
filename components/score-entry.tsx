"use client";

import { useEffect, useState, useEffectEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Hole, HoleScore, Round } from "@/lib/types";

type ScoreEntryProps = {
  round: Round;
  playerId: string;
  playerName: string;
  holes: Hole[];
  onBack: () => void;
};

export function ScoreEntry({
  round,
  playerId,
  playerName,
  holes,
  onBack,
}: ScoreEntryProps) {
  const [scores, setScores] = useState<Record<number, number>>({});
  const [activeHole, setActiveHole] = useState(1);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

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
  });

  useEffect(() => {
    void loadScores();
  }, [round.id, playerId]);

  const hole = holes.find((h) => h.hole_number === activeHole) ?? holes[0];
  const currentStrokes = scores[activeHole];
  const total = Object.values(scores).reduce((sum, n) => sum + n, 0);
  const holesPlayed = Object.keys(scores).length;

  async function saveStrokes(strokes: number) {
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
    const base = currentStrokes ?? hole.par;
    const next = Math.min(15, Math.max(1, base + delta));
    void saveStrokes(next);
  }

  return (
    <section className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-8">
      <header className="animate-rise">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted hover:text-ink"
        >
          ← All rounds
        </button>
        <h1 className="font-display mt-3 text-3xl text-ink">Your scorecard</h1>
        <p className="mt-2 text-sm text-muted">
          {playerName} · {round.name}
        </p>
      </header>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-2 animate-fade">
        {holes.map((h) => {
          const scored = scores[h.hole_number] != null;
          const isActive = h.hole_number === activeHole;
          return (
            <button
              key={h.id}
              type="button"
              onClick={() => setActiveHole(h.hole_number)}
              className={[
                "flex h-11 w-11 shrink-0 flex-col items-center justify-center border text-xs",
                isActive
                  ? "border-pine bg-pine text-fog"
                  : scored
                    ? "border-fairway bg-white text-ink"
                    : "border-mist bg-white text-muted",
              ].join(" ")}
            >
              <span>{h.hole_number}</span>
              {scored ? (
                <span className="text-[10px] opacity-80">{scores[h.hole_number]}</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-6 border border-mist bg-white p-6 animate-rise">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs tracking-[0.18em] text-fairway uppercase">
              Hole {hole.hole_number}
            </p>
            <p className="mt-2 text-sm text-muted">
              Par {hole.par}
              {hole.yards ? ` · ${hole.yards} yds` : ""}
              {hole.handicap_index ? ` · HCP ${hole.handicap_index}` : ""}
            </p>
          </div>
          <p className="font-display text-5xl text-ink">
            {currentStrokes ?? "—"}
          </p>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => bump(-1)}
            disabled={saving}
            className="border border-mist py-4 text-2xl text-ink hover:bg-fog disabled:opacity-50"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => void saveStrokes(hole.par)}
            disabled={saving}
            className="border border-pine bg-pine py-4 text-sm font-semibold tracking-wide text-fog hover:brightness-110 disabled:opacity-50"
          >
            Set par
          </button>
          <button
            type="button"
            onClick={() => bump(1)}
            disabled={saving}
            className="border border-mist py-4 text-2xl text-ink hover:bg-fog disabled:opacity-50"
          >
            +
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={activeHole <= 1}
            onClick={() => setActiveHole((h) => Math.max(1, h - 1))}
            className="border border-mist py-3 text-sm text-ink disabled:opacity-40"
          >
            Prev hole
          </button>
          <button
            type="button"
            disabled={activeHole >= 18}
            onClick={() => setActiveHole((h) => Math.min(18, h + 1))}
            className="border border-mist py-3 text-sm text-ink disabled:opacity-40"
          >
            Next hole
          </button>
        </div>
      </div>

      <footer className="mt-6 flex items-center justify-between text-sm text-muted">
        <span>
          {holesPlayed} hole{holesPlayed === 1 ? "" : "s"} · total {total || "—"}
        </span>
        <span>{saving ? "Saving…" : message || "Saved to cloud"}</span>
      </footer>
    </section>
  );
}
