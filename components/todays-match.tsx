"use client";

import { useMemo } from "react";
import { TeamSwatch } from "@/components/team-swatch";
import {
  useLiveMatches,
  type MatchWithPlayers,
} from "@/hooks/use-live-matches";
import {
  calculateMatchPlayStanding,
  type MatchPlayStanding,
} from "@/lib/match-play";
import { compactMatchStatus } from "@/lib/match-status";
import { teamAccentColor, teamWashColor } from "@/lib/team-colors";
import { SEWANEE_TIME_ZONE } from "@/lib/tournament-overview";
import type { Hole, MatchPlayer, Player, Round, Team } from "@/lib/types";

type TodaysMatchProps = {
  today: string;
  rounds: Round[];
  holes: Hole[];
  teams: Team[];
  players: Player[];
  sessionPlayerId: string;
  onGoToPlay: (roundId: string, matchId?: string) => void;
};

type PostedMatch = {
  match: MatchWithPlayers;
  round: Round;
  sideA: MatchPlayer[];
  sideB: MatchPlayer[];
  standing: MatchPlayStanding;
  finalWinner: "team_a" | "team_b" | "halve" | null;
  finished: boolean;
};

function sessionOrder(round: Round) {
  if (/am/i.test(round.name)) return 0;
  if (/pm/i.test(round.name)) return 1;
  if (/singles|1v1|match play/i.test(round.name)) return 2;
  return 0;
}

function sessionLabel(round: Round) {
  const name = round.name;
  if (/friday am/i.test(name)) return "Friday AM · Best Ball";
  if (/friday pm/i.test(name)) return "Friday PM · 2-Man Shamble";
  if (/saturday am/i.test(name)) return "Saturday AM · Scramble";
  if (/singles|1v1|match play/i.test(name)) return "Saturday · Singles";
  if (/seeding/i.test(name)) return "Thursday · Seeding";
  return name.split("—")[0]?.trim() || name;
}

function shortName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
}

function displayDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: SEWANEE_TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function PersonalMatchCard({
  item,
  teamA,
  teamB,
  players,
  sessionPlayerId,
  today,
  onGoToPlay,
}: {
  item: PostedMatch;
  teamA: Team;
  teamB: Team;
  players: Player[];
  sessionPlayerId: string;
  today: string;
  onGoToPlay: (roundId: string, matchId?: string) => void;
}) {
  const { match, round, sideA, sideB, standing, finalWinner, finished } = item;
  const mySide = match.players.find(
    (player) => player.player_id === sessionPlayerId,
  );
  const teammates = match.players
    .filter(
      (player) =>
        player.team_id === mySide?.team_id &&
        player.player_id !== sessionPlayerId,
    )
    .map(
      (player) =>
        players.find((candidate) => candidate.id === player.player_id)
          ?.display_name ?? "Unknown",
    );
  const opponents = match.players
    .filter((player) => player.team_id !== mySide?.team_id)
    .map(
      (player) =>
        players.find((candidate) => candidate.id === player.player_id)
          ?.display_name ?? "Unknown",
    );
  const status = compactMatchStatus({
    lead: standing.lead,
    holesPlayed: standing.holesPlayed,
    holesRemaining: standing.holesRemaining,
    finalResult: finalWinner,
    closedEarly: Boolean(finalWinner && standing.holesRemaining > 0),
  });
  const live = !finished && standing.holesPlayed > 0;
  const colorA = teamAccentColor(teamA.color, "gold");
  const colorB = teamAccentColor(teamB.color, "green");
  const aLeading = standing.lead > 0;
  const bLeading = standing.lead < 0;

  return (
    <button
      type="button"
      onClick={() => onGoToPlay(round.id, match.id)}
      className={[
        "w-full animate-rise rounded-3xl border-2 bg-white px-5 py-4 text-left shadow-[0_10px_30px_rgba(20,32,27,0.11)] transition hover:shadow-[0_12px_34px_rgba(20,32,27,0.15)]",
        finished ? "border-mist" : "border-pine",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-[0.16em] text-fairway uppercase">
          Your match
        </p>
        <span
          className={[
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
            finished
              ? "bg-mist text-muted"
              : live
                ? "bg-fairway/12 text-fairway"
                : "bg-gold/20 text-ink",
          ].join(" ")}
        >
          {live ? (
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-fairway" />
          ) : null}
          {finished ? "Finished" : live ? "Live now" : "Up next"}
        </span>
      </div>

      <p className="mt-2 text-base font-semibold text-ink">
        {sessionLabel(round)} · Match {match.match_number}
      </p>
      <p className="mt-1 text-sm text-muted">
        {teammates.length > 0
          ? `You & ${teammates.map(shortName).join(" & ")}`
          : "You"}{" "}
        vs {opponents.map(shortName).join(" & ") || "TBD"}
      </p>

      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border border-mist bg-fog/50 px-3 py-2">
        <div
          className="min-w-0 rounded-lg px-2 py-1"
          style={
            aLeading ? { backgroundColor: teamWashColor(colorA) } : undefined
          }
        >
          <div className="flex items-center gap-1.5">
            <TeamSwatch color={colorA} className="h-2 w-2" />
            <span
              className="truncate text-xs font-medium"
              style={aLeading ? { color: colorA } : undefined}
            >
              {teamA.name}
            </span>
          </div>
          {sideA.map((player) => {
            const name =
              players.find((candidate) => candidate.id === player.player_id)
                ?.display_name ?? "Unknown";
            return (
              <p
                key={player.player_id}
                className={[
                  "mt-0.5 truncate text-[11px]",
                  player.player_id === sessionPlayerId
                    ? "font-semibold text-pine"
                    : "text-muted",
                ].join(" ")}
              >
                {shortName(name)}
                {player.player_id === sessionPlayerId ? " · You" : ""}
              </p>
            );
          })}
        </div>

        <div className="text-center">
          <p
            className="font-display text-base leading-none"
            style={{ color: aLeading ? colorA : bLeading ? colorB : undefined }}
          >
            {status === "Not started" ? "VS" : status.toUpperCase()}
          </p>
          <p className="mt-0.5 text-[9px] font-medium text-muted uppercase">
            {finished
              ? "Finished"
              : live
                ? `Thru ${standing.holesPlayed}`
                : "Ready"}
          </p>
        </div>

        <div
          className="min-w-0 rounded-lg px-2 py-1 text-right"
          style={
            bLeading ? { backgroundColor: teamWashColor(colorB) } : undefined
          }
        >
          <div className="flex items-center justify-end gap-1.5">
            <span
              className="truncate text-xs font-medium"
              style={bLeading ? { color: colorB } : undefined}
            >
              {teamB.name}
            </span>
            <TeamSwatch color={colorB} className="h-2 w-2" />
          </div>
          {sideB.map((player) => {
            const name =
              players.find((candidate) => candidate.id === player.player_id)
                ?.display_name ?? "Unknown";
            return (
              <p
                key={player.player_id}
                className={[
                  "mt-0.5 truncate text-[11px]",
                  player.player_id === sessionPlayerId
                    ? "font-semibold text-pine"
                    : "text-muted",
                ].join(" ")}
              >
                {shortName(name)}
                {player.player_id === sessionPlayerId ? " · You" : ""}
              </p>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-muted">
          {displayDate(today)} · updates live
        </span>
        <span className="rounded-full bg-pine px-3 py-1.5 text-xs font-semibold text-fog">
          {finished
            ? "View match →"
            : live
              ? "Continue scoring →"
              : "Open match →"}
        </span>
      </div>
    </button>
  );
}

export function TodaysMatch({
  today,
  rounds,
  holes,
  teams,
  players,
  sessionPlayerId,
  onGoToPlay,
}: TodaysMatchProps) {
  const todaysRounds = useMemo(
    () =>
      rounds
        .filter((round) => round.play_date === today)
        .sort((a, b) => sessionOrder(a) - sessionOrder(b)),
    [rounds, today],
  );
  const matchRoundIds = useMemo(
    () =>
      todaysRounds
        .filter((round) => round.scoring_format === "match")
        .map((round) => round.id),
    [todaysRounds],
  );
  const { matches, scoresByRound, updatedAt, message } =
    useLiveMatches(matchRoundIds);
  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.name.localeCompare(b.name)),
    [teams],
  );
  const [teamA, teamB] = sortedTeams;

  const postedMatches = useMemo<PostedMatch[]>(() => {
    if (!teamA || !teamB) return [];

    return matches
      .filter((match) =>
        match.players.some((player) => player.player_id === sessionPlayerId),
      )
      .map((match) => {
        const round =
          todaysRounds.find((item) => item.id === match.round_id) ?? null;
        if (!round) return null;
        const sideA = match.players.filter(
          (player) => player.team_id === teamA.id,
        );
        const sideB = match.players.filter(
          (player) => player.team_id === teamB.id,
        );
        const standing = calculateMatchPlayStanding({
          round,
          holes,
          sideA,
          sideB,
          sideSize: match.side_size,
          players,
          scoresByPlayer: scoresByRound[round.id] ?? {},
          teamAName: teamA.name,
          teamBName: teamB.name,
        });
        const finalWinner =
          standing.finalResult ??
          (match.is_halved
            ? "halve"
            : match.winning_team_id === teamA.id
              ? "team_a"
              : match.winning_team_id === teamB.id
                ? "team_b"
                : null);
        const finished = match.status === "complete" || Boolean(finalWinner);
        return { match, round, sideA, sideB, standing, finalWinner, finished };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => {
        const roundOrder = sessionOrder(a.round) - sessionOrder(b.round);
        return roundOrder || a.match.match_number - b.match.match_number;
      });
  }, [
    matches,
    todaysRounds,
    sessionPlayerId,
    teamA,
    teamB,
    holes,
    players,
    scoresByRound,
  ]);
  const finalMatchRoundId =
    todaysRounds.filter((round) => round.scoring_format === "match").at(-1)
      ?.id ?? null;
  // Between sessions, keep a finished match until the player's next lineup is
  // posted. The day's final session disappears immediately once completed.
  const visibleMatches = postedMatches.filter(
    (item, index) => {
      if (!item.finished) return true;
      if (item.round.id === finalMatchRoundId) return false;
      return index === postedMatches.length - 1;
    },
  );

  const strokeRound = todaysRounds.find(
    (round) => round.scoring_format === "stroke",
  );

  if (visibleMatches.length === 0) {
    if (!updatedAt && matchRoundIds.length > 0) {
      return null;
    }

    if (strokeRound) {
      return (
        <button
          type="button"
          onClick={() => onGoToPlay(strokeRound.id)}
          className="mt-5 w-full animate-rise rounded-3xl border border-pine/25 bg-white px-5 py-4 text-left shadow-[0_10px_30px_rgba(20,32,27,0.1)] transition hover:border-pine/50"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold tracking-[0.16em] text-fairway uppercase">
              Your round
            </p>
            <span className="rounded-full bg-pine px-3 py-1 text-xs font-semibold text-fog">
              Open scoring →
            </span>
          </div>
          <p className="mt-2 text-base font-semibold text-ink">
            Thursday · Individual Seeding
          </p>
          <p className="mt-1 text-sm text-muted">{displayDate(today)}</p>
        </button>
      );
    }

    return null;
  }

  return (
    <div className="mt-5 space-y-3">
      {visibleMatches.map((item) => (
        <PersonalMatchCard
          key={item.match.id}
          item={item}
          teamA={teamA}
          teamB={teamB}
          players={players}
          sessionPlayerId={sessionPlayerId}
          today={today}
          onGoToPlay={onGoToPlay}
        />
      ))}
      {message ? <p className="text-xs text-danger">{message}</p> : null}
    </div>
  );
}
