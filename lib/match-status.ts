/** Compact match-play status labels (AS, 1 up, 2&1, …). */
export function compactMatchStatus(args: {
  lead: number;
  holesPlayed: number;
  holesRemaining: number;
  finalResult: "team_a" | "team_b" | "halve" | null;
  closedEarly: boolean;
}): string {
  const { lead, holesPlayed, holesRemaining, finalResult } = args;
  if (holesPlayed === 0) return "Not started";
  if (finalResult === "halve") return "Halved";
  if (finalResult === "team_a" || finalResult === "team_b") {
    const n = Math.abs(lead);
    if (args.closedEarly) return `${n}&${holesRemaining}`;
    return n === 1 ? "1 up" : `${n} up`;
  }
  if (lead === 0) return "AS";
  const n = Math.abs(lead);
  if (n === holesRemaining) return `Dormie · ${n === 1 ? "1 up" : `${n} up`}`;
  return n === 1 ? "1 up" : `${n} up`;
}
