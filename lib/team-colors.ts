/** Canonical Cup team colors — match Play tab live board. */

export const TEAM_GOLD = "#c4a35a";
export const TEAM_GREEN = "#2f6b4f";

/** Soft gold wash when gold side is up (same as LiveMatchCard). */
export const TEAM_GOLD_WASH = `${TEAM_GOLD}40`;

/** Soft green wash when green side is up (same as LiveMatchCard). */
export const TEAM_GREEN_WASH = "rgba(47, 107, 79, 0.28)";

export function isLightTeamColor(color: string | null | undefined) {
  const value = (color ?? "").toLowerCase();
  return (
    value === "#ffffff" ||
    value === "#fff" ||
    value === "white" ||
    value === TEAM_GOLD.toLowerCase()
  );
}

/**
 * Resolve the accent/text color for a team.
 * Maps legacy dark pine (#16352a) to Play-tab fairway green.
 */
export function teamAccentColor(
  stored: string | null | undefined,
  fallback: "gold" | "green" = "gold",
): string {
  const value = (stored ?? "").toLowerCase();
  if (!value) return fallback === "gold" ? TEAM_GOLD : TEAM_GREEN;
  if (value === "#16352a" || value === "#0c1f18") return TEAM_GREEN;
  if (value === TEAM_GOLD.toLowerCase() || value === "#c4a35a") return TEAM_GOLD;
  if (value === TEAM_GREEN.toLowerCase() || value === "#2f6b4f") return TEAM_GREEN;
  // Gold-like mid tones still use stored; dark greens → green accent
  if (fallback === "green") return TEAM_GREEN;
  return stored as string;
}

export function teamWashColor(accent: string): string {
  const value = accent.toLowerCase();
  if (value === TEAM_GOLD.toLowerCase()) return TEAM_GOLD_WASH;
  if (value === TEAM_GREEN.toLowerCase()) return TEAM_GREEN_WASH;
  if (/^#[0-9a-f]{6}$/.test(value)) return `${accent}40`;
  return TEAM_GOLD_WASH;
}
