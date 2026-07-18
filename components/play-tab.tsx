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
        <div className="mx-auto flex max-w-2xl gap-2 px-5 pt-4">
          <button
            type="button"
            onClick={() => setMode("score")}
            className={[
              "flex-1 px-3 py-2.5 text-sm font-semibold",
              mode === "score"
                ? "bg-pine text-fog"
                : "border border-mist bg-white text-muted hover:text-ink",
            ].join(" ")}
          >
            Score
          </button>
          <button
            type="button"
            onClick={() => setMode("lineups")}
            className={[
              "flex-1 px-3 py-2.5 text-sm font-semibold",
              mode === "lineups"
                ? "bg-pine text-fog"
                : "border border-mist bg-white text-muted hover:text-ink",
            ].join(" ")}
          >
            Lineups
          </button>
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
