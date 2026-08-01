import type { MatchPlayStanding } from "@/lib/match-play";

export type MatchCompletionFields = {
  status: "complete";
  is_halved: boolean;
  winning_team_id: string | null;
};

/** Build DB fields from a finished match-play standing, or null if not finished. */
export function desiredMatchCompletion(
  standing: MatchPlayStanding,
  teamAId: string,
  teamBId: string,
): MatchCompletionFields | null {
  if (!standing.finalResult) return null;
  return {
    status: "complete",
    is_halved: standing.finalResult === "halve",
    winning_team_id:
      standing.finalResult === "halve"
        ? null
        : standing.finalResult === "team_a"
          ? teamAId
          : teamBId,
  };
}

export function matchNeedsFinalize(
  match: {
    status: string;
    is_halved: boolean;
    winning_team_id: string | null;
  },
  desired: MatchCompletionFields,
) {
  return !(
    match.status === desired.status &&
    match.is_halved === desired.is_halved &&
    match.winning_team_id === desired.winning_team_id
  );
}
