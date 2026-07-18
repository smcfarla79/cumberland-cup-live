"use client";

import { TeamSwatch } from "@/components/team-swatch";
import {
  TEAM_GREEN,
  isLightTeamColor,
  teamAccentColor,
  teamWashColor,
} from "@/lib/team-colors";
import type { MatchPlayer, Player, Team } from "@/lib/types";

function shortPlayerName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
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
  /** When true, only the winning side is highlighted (loser stays white). */
  isFinal?: boolean;
  /** Cup result when final: team_a, team_b, or halve. */
  finalWinner?: "team_a" | "team_b" | "halve" | null;
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
  isFinal = false,
  finalWinner = null,
  onClick,
}: LiveMatchCardProps) {
  const colorA = teamAccentColor(teamA.color, "gold");
  const colorB = teamAccentColor(teamB.color, "green");
  const aIsLight = isLightTeamColor(colorA);

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

  const aWon = isFinal && finalWinner === "team_a";
  const bWon = isFinal && finalWinner === "team_b";
  const highlightA = aWon || (!isFinal && aLeading);
  const highlightB = bWon || (!isFinal && bLeading);
  const emphasizeA = highlightA;
  const emphasizeB = highlightB;

  const textA = highlightA ? colorA : "#14201b";
  const textB = highlightB ? colorB : "#14201b";

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
        style={{
          backgroundColor: highlightA ? teamWashColor(colorA) : "#ffffff",
        }}
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
                  emphasizeA ? "font-semibold" : "font-medium",
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
            color: highlightA
              ? colorA
              : highlightB
                ? colorB
                : TEAM_GREEN,
          }}
        >
          {statusDisplay}
        </p>
        <span className="h-px flex-1 bg-mist" aria-hidden />
      </div>

      <div
        className="flex items-stretch gap-3 px-3 py-3"
        style={{
          backgroundColor: highlightB ? teamWashColor(colorB) : "#ffffff",
        }}
      >
        <div
          className="w-1 shrink-0 self-stretch rounded-full"
          style={{ backgroundColor: colorB }}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="mb-1.5">
            <TeamSwatch color={colorB} className="h-2 w-2" />
          </div>
          {namesB.length === 0 ? (
            <p className="text-sm" style={{ color: textB }}>
              —
            </p>
          ) : (
            namesB.map((name) => (
              <p
                key={name}
                className={[
                  "truncate text-sm leading-snug",
                  emphasizeB ? "font-semibold" : "font-medium",
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
