"use client";

import { useState } from "react";
import { MatchesTab } from "@/components/matches-tab";
import { ScoreTab } from "@/components/score-tab";
import type { Hole, Player, Round, Team } from "@/lib/types";

type PlayTabProps = {
  sessionPlayerId: string;
  sessionPlayerName: string;
  players: Player[];
  rounds: Round[];
  holes: Hole[];
  teams: Team[];
  isAdmin: boolean;
  /** Optional deep-link into a session when arriving from Cup “Now playing”. */
  initialRoundId?: string | null;
  onConsumeInitialRound?: () => void;
};

type PlayMode = "score" | "lineups";

export function PlayTab({
  sessionPlayerId,
  sessionPlayerName,
  players,
  rounds,
  holes,
  teams,
  isAdmin,
  initialRoundId = null,
  onConsumeInitialRound,
}: PlayTabProps) {
  const [mode, setMode] = useState<PlayMode>("score");

  return (
    <div>
      {isAdmin ? (
        <div className="mx-auto max-w-2xl px-5 pt-4">
          <div className="flex gap-1 rounded-full border border-mist/70 bg-mist/40 p-1 shadow-inner">
            <button
              type="button"
              onClick={() => setMode("score")}
              className={[
                "flex-1 rounded-full px-3 py-2 text-sm font-semibold transition-all duration-200",
                mode === "score"
                  ? "bg-pine text-fog shadow-[0_2px_8px_rgba(12,31,24,0.35)]"
                  : "text-muted hover:bg-white/60 hover:text-ink",
              ].join(" ")}
            >
              Score
            </button>
            <button
              type="button"
              onClick={() => setMode("lineups")}
              className={[
                "flex-1 rounded-full px-3 py-2 text-sm font-semibold transition-all duration-200",
                mode === "lineups"
                  ? "bg-pine text-fog shadow-[0_2px_8px_rgba(12,31,24,0.35)]"
                  : "text-muted hover:bg-white/60 hover:text-ink",
              ].join(" ")}
            >
              Lineups
            </button>
          </div>
        </div>
      ) : null}

      {mode === "lineups" && isAdmin ? (
        <MatchesTab
          players={players}
          teams={teams}
          rounds={rounds}
          holes={holes}
          isAdmin={isAdmin}
          sessionPlayerId={sessionPlayerId}
          title="Lineups"
        />
      ) : (
        <ScoreTab
          sessionPlayerId={sessionPlayerId}
          sessionPlayerName={sessionPlayerName}
          players={players}
          rounds={rounds}
          holes={holes}
          teams={teams}
          isAdmin={isAdmin}
          title="Play"
          initialRoundId={initialRoundId}
          onConsumeInitialRound={onConsumeInitialRound}
        />
      )}
    </div>
  );
}
