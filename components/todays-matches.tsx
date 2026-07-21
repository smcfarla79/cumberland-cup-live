"use client";

import { useMemo } from "react";
import { TeamSwatch } from "@/components/team-swatch";
import { useLiveMatches } from "@/hooks/use-live-matches";
import { calculateMatchPlayStanding } from "@/lib/match-play";
import { compactMatchStatus } from "@/lib/match-status";
import { formatLabel, resolvePlayFormat } from "@/lib/scoring";
import { teamAccentColor, teamWashColor } from "@/lib/team-colors";
import { SEWANEE_TIME_ZONE } from "@/lib/tournament-overview";
import type { Hole, Player, Round, Team } from "@/lib/types";

type TodaysMatchesProps = {
  today: string;
  rounds: Round[];
  holes: Hole[];
  teams: Team[];
  players: Player[];
  sessionPlayerId: string;
  isPreview?: boolean;
  onGoToPlay: (roundId: string, matchId?: string, viewOnly?: boolean) => void;
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

function displayDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: SEWANEE_TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function shortPlayerName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
}

export function TodaysMatches({
  today,
  rounds,
  holes,
  teams,
  players,
  sessionPlayerId,
  isPreview = false,
  onGoToPlay,
}: TodaysMatchesProps) {
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

  return (
    <section className="mt-5 animate-rise rounded-3xl border border-ink/10 bg-white px-4 py-5 shadow-[0_10px_30px_rgba(20,32,27,0.1)] sm:px-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-fairway uppercase">
            {isPreview ? "Schedule preview" : "Today\u2019s schedule"}
          </p>
          <h2 className="font-display mt-1 text-2xl text-ink">
            {displayDate(today)}
          </h2>
        </div>
        {updatedAt ? (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-mist bg-fog px-2.5 py-1 text-[10px] font-medium text-muted">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-fairway" aria-hidden />
            Live
          </span>
        ) : null}
      </div>

      {isPreview ? (
        <p className="mt-3 rounded-xl bg-gold/15 px-3 py-2 text-xs text-ink">
          Preview mode uses the real lineups and live scoring data.
        </p>
      ) : null}

      {todaysRounds.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-fog px-4 py-4 text-sm text-muted">
          No Cup matches are scheduled today.
        </p>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-ink/12 bg-white shadow-[0_4px_16px_rgba(20,32,27,0.06)]">
          {todaysRounds.map((round, roundIndex) => {
            const roundMatches = matches
              .filter((match) => match.round_id === round.id)
              .sort((a, b) => a.match_number - b.match_number);

            return (
              <div
                key={round.id}
                className={roundIndex > 0 ? "border-t-2 border-mist" : ""}
              >
                <div className="flex items-center justify-between gap-3 bg-fog/90 px-3 py-3">
                  <div>
                    <h3 className="text-sm font-semibold text-ink">
                      {sessionLabel(round)}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatLabel(resolvePlayFormat(round))}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onGoToPlay(round.id)}
                    className="shrink-0 rounded-full border border-mist px-3 py-1.5 text-xs font-semibold text-pine transition hover:border-fairway/50"
                  >
                    View session →
                  </button>
                </div>

                {round.scoring_format === "stroke" ? (
                  <button
                    type="button"
                    onClick={() => onGoToPlay(round.id)}
                    className="w-full border-t border-mist px-3 py-3 text-left transition hover:bg-fog/70"
                  >
                    <p className="text-sm font-semibold text-ink">
                      Individual seeding round
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Open Play to enter or review today&apos;s scores.
                    </p>
                  </button>
                ) : roundMatches.length === 0 ? (
                  <p className="border-t border-mist px-3 py-4 text-sm text-muted">
                    Lineups have not been posted yet.
                  </p>
                ) : !teamA || !teamB ? (
                  <p className="border-t border-mist px-3 py-4 text-sm text-muted">
                    Team assignments are not ready yet.
                  </p>
                ) : (
                  <div className="border-t border-mist">
                    <div className="grid grid-cols-[1fr_4rem_1fr] gap-1 bg-white px-3 py-1.5 text-[9px] font-semibold tracking-wider text-muted uppercase">
                      <span className="flex items-center gap-1 truncate">
                        <TeamSwatch
                          color={teamAccentColor(teamA.color, "gold")}
                          className="h-1.5 w-1.5"
                        />
                        {teamA.name}
                      </span>
                      <span className="text-center">Match</span>
                      <span className="flex items-center justify-end gap-1 truncate">
                        {teamB.name}
                        <TeamSwatch
                          color={teamAccentColor(teamB.color, "green")}
                          className="h-1.5 w-1.5"
                        />
                      </span>
                    </div>

                    {roundMatches.map((match, matchIndex) => {
                      const includesMe = match.players.some(
                        (player) => player.player_id === sessionPlayerId,
                      );
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
                      const isFinal =
                        match.status === "complete" || Boolean(finalWinner);
                      const status = compactMatchStatus({
                        lead: standing.lead,
                        holesPlayed: standing.holesPlayed,
                        holesRemaining: standing.holesRemaining,
                        finalResult: finalWinner,
                        closedEarly: Boolean(
                          finalWinner && standing.holesRemaining > 0,
                        ),
                      });
                      const aLeading = standing.lead > 0;
                      const bLeading = standing.lead < 0;
                      const colorA = teamAccentColor(teamA.color, "gold");
                      const colorB = teamAccentColor(teamB.color, "green");
                      const statusDisplay =
                        status === "Not started" ? "VS" : status.toUpperCase();
                      const progressLabel = isFinal
                        ? "Finished"
                        : standing.holesPlayed > 0
                          ? `Thru ${standing.holesPlayed}`
                          : `Match ${match.match_number}`;

                      return (
                        <button
                          key={match.id}
                          type="button"
                          onClick={() =>
                            onGoToPlay(round.id, match.id, !includesMe)
                          }
                          className={[
                            "grid w-full grid-cols-[1fr_4rem_1fr] items-center gap-1 py-2.5 text-left transition",
                            matchIndex > 0 ? "border-t border-ink/10" : "",
                            includesMe
                              ? "border-l-[3px] border-l-pine bg-pine/[0.055] pl-[calc(0.75rem-3px)] pr-3"
                              : "px-3 hover:bg-fog/70",
                          ].join(" ")}
                        >
                          <div
                            className="min-w-0 rounded-lg px-1.5 py-1"
                            style={
                              aLeading
                                ? { backgroundColor: teamWashColor(colorA) }
                                : undefined
                            }
                          >
                            {sideA.length === 0 ? (
                              <p className="text-xs text-muted">—</p>
                            ) : (
                              sideA.map((matchPlayer) => {
                                const isYou =
                                  matchPlayer.player_id === sessionPlayerId;
                                const name =
                                  players.find(
                                    (player) =>
                                      player.id === matchPlayer.player_id,
                                  )?.display_name ?? "Unknown";
                                return (
                                  <p
                                    key={matchPlayer.player_id}
                                    className={[
                                      "truncate text-xs leading-snug sm:text-[13px]",
                                      aLeading ? "font-semibold" : "font-medium",
                                    ].join(" ")}
                                    style={aLeading ? { color: colorA } : undefined}
                                  >
                                    <span
                                      className={
                                        isYou
                                          ? "rounded-full bg-pine px-1.5 py-0.5 text-fog"
                                          : ""
                                      }
                                    >
                                      {shortPlayerName(name)}
                                    </span>
                                  </p>
                                );
                              })
                            )}
                          </div>

                          <div className="flex flex-col items-center text-center">
                            <p
                              className="font-display text-sm leading-none tracking-wide"
                              style={{
                                color: aLeading
                                  ? colorA
                                  : bLeading
                                    ? colorB
                                    : undefined,
                              }}
                            >
                              {statusDisplay}
                            </p>
                            <p className="mt-0.5 text-[9px] font-medium text-muted">
                              {progressLabel}
                            </p>
                            {includesMe ? (
                              <span className="mt-0.5 text-[9px] font-semibold tracking-wide text-pine uppercase">
                                You
                              </span>
                            ) : null}
                          </div>

                          <div
                            className="min-w-0 rounded-lg px-1.5 py-1 text-right"
                            style={
                              bLeading
                                ? { backgroundColor: teamWashColor(colorB) }
                                : undefined
                            }
                          >
                            {sideB.length === 0 ? (
                              <p className="text-xs text-muted">—</p>
                            ) : (
                              sideB.map((matchPlayer) => {
                                const isYou =
                                  matchPlayer.player_id === sessionPlayerId;
                                const name =
                                  players.find(
                                    (player) =>
                                      player.id === matchPlayer.player_id,
                                  )?.display_name ?? "Unknown";
                                return (
                                  <p
                                    key={matchPlayer.player_id}
                                    className={[
                                      "truncate text-xs leading-snug sm:text-[13px]",
                                      bLeading ? "font-semibold" : "font-medium",
                                    ].join(" ")}
                                    style={bLeading ? { color: colorB } : undefined}
                                  >
                                    <span
                                      className={
                                        isYou
                                          ? "rounded-full bg-pine px-1.5 py-0.5 text-fog"
                                          : ""
                                      }
                                    >
                                      {shortPlayerName(name)}
                                    </span>
                                  </p>
                                );
                              })
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {message ? <p className="mt-4 text-xs text-danger">{message}</p> : null}
    </section>
  );
}
