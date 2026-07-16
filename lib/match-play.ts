import { holesForRound } from "@/lib/course-holes";
import { bestBallNet, netScore, resolvePlayFormat } from "@/lib/scoring";
import type { Hole, MatchPlayer, Player, Round, Team } from "@/lib/types";

export type HoleResult = {
  holeNumber: number;
  par: number;
  teamANet: number | null;
  teamBNet: number | null;
  winner: "team_a" | "team_b" | "halve" | "incomplete";
};

export type MatchPlayStanding = {
  holesPlayed: number;
  holesRemaining: number;
  teamAHolesWon: number;
  teamBHolesWon: number;
  /** Positive = Team A up, negative = Team B up */
  lead: number;
  statusLabel: string;
  /** Final result once every hole has scores from all players */
  finalResult: "team_a" | "team_b" | "halve" | null;
  holeResults: HoleResult[];
  complete: boolean;
};

function sideNets(args: {
  side: MatchPlayer[];
  holeNumber: number;
  holeStrokeIndex: number | null;
  players: Player[];
  scoresByPlayer: Record<string, Record<number, number>>;
}): Array<number | null> {
  return args.side.map((mp) => {
    const gross = args.scoresByPlayer[mp.player_id]?.[args.holeNumber];
    if (gross == null) return null;
    const player = args.players.find((p) => p.id === mp.player_id);
    return netScore(gross, player?.handicap ?? null, args.holeStrokeIndex);
  });
}

function teamHoleScore(
  nets: Array<number | null>,
  sideSize: number,
): number | null {
  if (nets.some((n) => n == null) || nets.length < sideSize) return null;
  // 2v2 formats: best net on the hole. Singles: the one net.
  return bestBallNet(nets);
}

export function calculateMatchPlayStanding(args: {
  round: Round;
  holes: Hole[];
  sideA: MatchPlayer[];
  sideB: MatchPlayer[];
  sideSize: number;
  players: Player[];
  scoresByPlayer: Record<string, Record<number, number>>;
  teamAName: string;
  teamBName: string;
}): MatchPlayStanding {
  const roundHoles = holesForRound(args.round, args.holes);
  const holeResults: HoleResult[] = [];

  let teamAHolesWon = 0;
  let teamBHolesWon = 0;
  let holesPlayed = 0;

  for (const hole of roundHoles) {
    const netsA = sideNets({
      side: args.sideA,
      holeNumber: hole.hole_number,
      holeStrokeIndex: hole.handicap_index,
      players: args.players,
      scoresByPlayer: args.scoresByPlayer,
    });
    const netsB = sideNets({
      side: args.sideB,
      holeNumber: hole.hole_number,
      holeStrokeIndex: hole.handicap_index,
      players: args.players,
      scoresByPlayer: args.scoresByPlayer,
    });

    const teamANet = teamHoleScore(netsA, args.sideSize);
    const teamBNet = teamHoleScore(netsB, args.sideSize);

    let winner: HoleResult["winner"] = "incomplete";
    if (teamANet != null && teamBNet != null) {
      holesPlayed += 1;
      if (teamANet < teamBNet) {
        winner = "team_a";
        teamAHolesWon += 1;
      } else if (teamBNet < teamANet) {
        winner = "team_b";
        teamBHolesWon += 1;
      } else {
        winner = "halve";
      }
    }

    holeResults.push({
      holeNumber: hole.hole_number,
      par: hole.par,
      teamANet,
      teamBNet,
      winner,
    });
  }

  const holesRemaining = roundHoles.length - holesPlayed;
  const lead = teamAHolesWon - teamBHolesWon;
  const complete = holesPlayed === roundHoles.length && roundHoles.length > 0;

  let finalResult: MatchPlayStanding["finalResult"] = null;
  if (complete) {
    if (lead > 0) finalResult = "team_a";
    else if (lead < 0) finalResult = "team_b";
    else finalResult = "halve";
  } else if (holesPlayed > 0 && Math.abs(lead) > holesRemaining) {
    // Match closed early (e.g. 3&2)
    finalResult = lead > 0 ? "team_a" : "team_b";
  }

  const statusLabel = buildStatusLabel({
    lead,
    holesPlayed,
    holesRemaining,
    complete,
    finalResult,
    teamAName: args.teamAName,
    teamBName: args.teamBName,
    closedEarly: Boolean(finalResult && !complete),
  });

  return {
    holesPlayed,
    holesRemaining,
    teamAHolesWon,
    teamBHolesWon,
    lead,
    statusLabel,
    finalResult,
    holeResults,
    complete: Boolean(finalResult),
  };
}

function buildStatusLabel(args: {
  lead: number;
  holesPlayed: number;
  holesRemaining: number;
  complete: boolean;
  finalResult: MatchPlayStanding["finalResult"];
  teamAName: string;
  teamBName: string;
  closedEarly: boolean;
}): string {
  const { lead, holesPlayed, holesRemaining, finalResult, teamAName, teamBName } =
    args;

  if (holesPlayed === 0) return "Not started";

  if (finalResult === "halve") return "Match halved";
  if (finalResult === "team_a") {
    if (args.closedEarly) {
      return `${teamAName} wins ${Math.abs(lead)}&${holesRemaining}`;
    }
    return `${teamAName} wins ${formatUp(lead)}`;
  }
  if (finalResult === "team_b") {
    if (args.closedEarly) {
      return `${teamBName} wins ${Math.abs(lead)}&${holesRemaining}`;
    }
    return `${teamBName} wins ${formatUp(Math.abs(lead))}`;
  }

  if (lead === 0) return `All square through ${holesPlayed}`;
  if (lead > 0) {
    if (lead === holesRemaining) {
      return `${teamAName} dormie (${formatUp(lead)})`;
    }
    return `${teamAName} ${formatUp(lead)} through ${holesPlayed}`;
  }
  if (Math.abs(lead) === holesRemaining) {
    return `${teamBName} dormie (${formatUp(Math.abs(lead))})`;
  }
  return `${teamBName} ${formatUp(Math.abs(lead))} through ${holesPlayed}`;
}

function formatUp(n: number) {
  return n === 1 ? "1 up" : `${n} up`;
}

export function isMatchPlayFormat(round: Round) {
  const format = resolvePlayFormat(round);
  return (
    format === "best_ball" ||
    format === "scramble" ||
    format === "shamble" ||
    format === "singles"
  );
}
