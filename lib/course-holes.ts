import type { Hole, Round } from "@/lib/types";

/**
 * The Course at Sewanee is a 9-hole layout played as an 18-hole scorecard.
 * Holes 1–9 = front nine tees/pars/yardages.
 * Holes 10–18 = same physical holes from different (usually forward) tees —
 * often different par and yardage (see scorecard).
 */
export function holesForRound(round: Round, courseHoles: Hole[]): Hole[] {
  const sorted = [...courseHoles].sort(
    (a, b) => a.hole_number - b.hole_number,
  );

  if (round.nine_label === "front" || (round.hole_count === 9 && round.nine_label !== "back")) {
    return sorted.filter((h) => h.hole_number >= 1 && h.hole_number <= 9);
  }

  if (round.nine_label === "back") {
    return sorted.filter((h) => h.hole_number >= 10 && h.hole_number <= 18);
  }

  // Full 18 (e.g. singles): use scorecard holes 1–18 with their tee-specific data
  return sorted.filter((h) => h.hole_number >= 1 && h.hole_number <= 18);
}

/** Physical hole 1–9 for a scorecard number 1–18. */
export function physicalHoleNumber(scorecardHole: number) {
  if (scorecardHole >= 10) return scorecardHole - 9;
  return scorecardHole;
}

export function nineCaption(round: Round) {
  if (round.nine_label === "front") {
    return "Front 9 · scorecard holes 1–9";
  }
  if (round.nine_label === "back") {
    return "Back 9 · scorecard holes 10–18 (same holes, different tees)";
  }
  if (round.hole_count === 18) {
    return "18 holes · front tees then back tees";
  }
  return `${round.hole_count ?? 9} holes`;
}
