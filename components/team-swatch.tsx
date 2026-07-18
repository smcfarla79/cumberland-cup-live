"use client";

import { TEAM_GOLD, isLightTeamColor, teamAccentColor } from "@/lib/team-colors";

/** Team color swatch — light/gold colors get a ring so they stay visible. */
export function TeamSwatch({
  color,
  className = "h-2.5 w-2.5",
}: {
  color: string | null | undefined;
  className?: string;
}) {
  const value = teamAccentColor(color, "gold") || TEAM_GOLD;
  const light = isLightTeamColor(value);

  return (
    <span
      className={`inline-block shrink-0 rounded-full ${className}`}
      style={{
        backgroundColor: value,
        boxShadow: light
          ? "inset 0 0 0 1px rgba(20, 32, 27, 0.35)"
          : undefined,
        outline: light ? "1px solid rgba(20, 32, 27, 0.2)" : undefined,
      }}
      aria-hidden
    />
  );
}
