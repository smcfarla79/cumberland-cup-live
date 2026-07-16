import type { Hole, Round } from "@/lib/types";

export type PlayFormat =
  | "stroke"
  | "best_ball"
  | "scramble"
  | "shamble"
  | "singles";

/** Strokes a player receives on a hole from course handicap + hole stroke index. */
export function strokesReceivedOnHole(
  courseHandicap: number | null | undefined,
  holeStrokeIndex: number | null | undefined,
): number {
  if (
    courseHandicap == null ||
    courseHandicap <= 0 ||
    holeStrokeIndex == null ||
    holeStrokeIndex < 1
  ) {
    return 0;
  }

  let strokes = 0;
  if (holeStrokeIndex <= courseHandicap) strokes += 1;
  if (courseHandicap > 18 && holeStrokeIndex <= courseHandicap - 18) {
    strokes += 1;
  }
  if (courseHandicap > 36 && holeStrokeIndex <= courseHandicap - 36) {
    strokes += 1;
  }
  return strokes;
}

export function netScore(
  gross: number,
  courseHandicap: number | null | undefined,
  holeStrokeIndex: number | null | undefined,
): number {
  return gross - strokesReceivedOnHole(courseHandicap, holeStrokeIndex);
}

/** Best ball = lowest net between partners on the hole. */
export function bestBallNet(nets: Array<number | null | undefined>): number | null {
  const values = nets.filter((n): n is number => n != null);
  if (values.length === 0) return null;
  return Math.min(...values);
}

export function resolvePlayFormat(round: Round): PlayFormat {
  if (round.play_format) return round.play_format;
  const name = round.name.toLowerCase();
  if (name.includes("best ball")) return "best_ball";
  if (name.includes("shamble")) return "shamble";
  if (name.includes("scramble")) return "scramble";
  if (name.includes("1v1") || name.includes("singles") || name.includes("match play")) {
    return "singles";
  }
  if (name.includes("stroke") || name.includes("seeding")) return "stroke";
  return round.scoring_format === "match" ? "best_ball" : "stroke";
}

export function formatLabel(format: PlayFormat): string {
  switch (format) {
    case "best_ball":
      return "Best ball (net)";
    case "scramble":
      return "Scramble";
    case "shamble":
      return "Shamble";
    case "singles":
      return "Singles";
    default:
      return "Stroke play";
  }
}

export function toParLabel(net: number, par: number): string {
  const diff = net - par;
  if (diff === 0) return "Par";
  if (diff === -1) return "Birdie";
  if (diff === -2) return "Eagle";
  if (diff <= -3) return "Albatross+";
  if (diff === 1) return "Bogey";
  if (diff === 2) return "Double";
  return `+${diff}`;
}

export function holeStrokeIndex(hole: Hole): number | null {
  return hole.handicap_index;
}
