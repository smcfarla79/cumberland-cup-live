"use client";

import { TeamSwatch } from "@/components/team-swatch";
import type { MatchPlayer, Player, Team } from "@/lib/types";

function shortPlayerName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
}

function isLightColor(color: string | null | undefined) {
  const value = (color ?? "").toLowerCase();
  return value === "#ffffff" || value === "#fff" || value === "white";
}

/** Soft wash from a hex color (6-digit). */
function wash(color: string, alphaHex = "14") {
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return `${color}${alphaHex}`;
  return `${color}14`;
}

type LiveMatchCardProps = {
  matchNumber: number;
  pointsValue: number;
  includesMe: boolean;
  sideA: MatchPlayer[];
  sideB: MatchPlayer[];
  teamA: Team;
  teamB: Team;
  players: Player[];
  holesPlayed: number;
  status: string;
  aLeading: boolean;
  bLeading: boolean;
  onClick: () => void;
};

export function LiveMatchCard({
  matchNumber,
  pointsValue,
  includesMe,
  sideA,
  sideB,
  teamA,
  teamB,
  players,
  holesPlayed,
  status,
  aLeading,
  bLeading,
  onClick,
}: LiveMatchCardProps) {
  const colorA = teamA.color ?? "#c4a35a";
  const colorB = teamB.color ?? "#16352a";
  const bIsLight = isLightColor(colorB);
  const aIsLight = isLightColor(colorA);

  const namesA = sideA.map((p) =>
    shortPlayerName(
      players.find((pl) => pl.id === p.player_id)?.display_name ?? "Unknown",
    ),
  );
  const namesB = sideB.map((p) =>
    shortPlayerName(
      players.find((pl) => pl.id === p.player_id)?.display_name ?? "Unknown",
    ),
  );

  const statusDisplay =
    status === "AS"
      ? "AS"
      : status === "Not started"
        ? "VS"
        : status === "All square"
          ? "AS"
          : status.toUpperCase();

  const thruLabel =
    holesPlayed > 0
      ? `Thru ${holesPlayed}`
      : status === "Not started"
        ? "Not started"
        : "Final";

  const textA = aIsLight ? "#14201b" : colorA;
  const textB = bIsLight ? "#14201b" : colorB;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full overflow-hidden border-2 bg-white text-left transition",
        includesMe
          ? "border-pine shadow-[0_0_0_1px_rgba(22,53,42,0.12)]"
          : "border-ink/20 hover:border-fairway/50",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <p className="text-[11px] tracking-[0.16em] text-muted uppercase">
          Match {matchNumber}
          {includesMe ? " · you" : ""}
          {" · "}
          {pointsValue} pt
        </p>
        <p className="text-[11px] tabular-nums text-muted">{thruLabel}</p>
      </div>

      <div
        className="flex items-stretch gap-3 px-3 py-3"
        style={{ backgroundColor: wash(colorA, "18") }}
      >
        <div
          className="w-1 shrink-0 self-stretch rounded-full"
          style={{
            backgroundColor: colorA,
            boxShadow: aIsLight
              ? "inset 0 0 0 1px rgba(20, 32, 27, 0.28)"
              : undefined,
          }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="mb-1.5">
            <TeamSwatch color={colorA} className="h-2 w-2" />
          </div>
          {namesA.length === 0 ? (
            <p className="text-sm" style={{ color: textA }}>
              —
            </p>
          ) : (
            namesA.map((name) => (
              <p
                key={name}
                className={[
                  "truncate text-sm leading-snug",
                  aLeading ? "font-semibold" : "font-medium",
                ].join(" ")}
                style={{ color: textA }}
              >
                {name}
              </p>
            ))
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 border-y border-mist bg-fog px-3 py-2">
        <span className="h-px flex-1 bg-mist" aria-hidden />
        <p
          className="font-display text-lg tracking-wide sm:text-xl"
          style={{
            color: aLeading ? colorA : bLeading ? colorB : "#16352a",
          }}
        >
          {statusDisplay}
        </p>
        <span className="h-px flex-1 bg-mist" aria-hidden />
      </div>

      <div
        className="flex items-stretch gap-3 px-3 py-3"
        style={{
          backgroundColor: bIsLight
            ? "rgba(20, 32, 27, 0.04)"
            : wash(colorB, "18"),
        }}
      >
        <div
          className="w-1 shrink-0 self-stretch rounded-full"
          style={{
            backgroundColor: bIsLight ? "#ffffff" : colorB,
            boxShadow: bIsLight
              ? "inset 0 0 0 1px rgba(20, 32, 27, 0.28)"
              : undefined,
          }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="mb-1.5">
            <TeamSwatch
              color={bIsLight ? "#FFFFFF" : colorB}
              className="h-2 w-2"
            />
          </div>
          {namesB.length === 0 ? (
            <p className="text-sm text-ink">—</p>
          ) : (
            namesB.map((name) => (
              <p
                key={name}
                className={[
                  "truncate text-sm leading-snug",
                  bLeading ? "font-semibold" : "font-medium",
                ].join(" ")}
                style={{ color: textB }}
              >
                {name}
              </p>
            ))
          )}
        </div>
      </div>
    </button>
  );
}
