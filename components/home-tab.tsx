"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import {
  fetchSewaneeWeather,
  formatForecastDay,
  SEWANEE_COORDS,
  weatherSceneTheme,
  type WeatherSnapshot,
} from "@/lib/sewanee-weather";
import { WeatherBackdrop } from "@/components/weather-backdrop";
import { useLiveMatches } from "@/hooks/use-live-matches";
import { calculateMatchPlayStanding } from "@/lib/match-play";
import { compactMatchStatus } from "@/lib/match-status";
import { teamAccentColor } from "@/lib/team-colors";
import {
  ATTENDEES,
  COMPETITION,
  COURSE_ADDRESS,
  COURSE_RULES,
  CUP_RULES,
  HOUSE_NOTES,
  HOUSES,
  SOCIAL,
  TEE_TIMES,
  WEEKEND_DATES,
  mapsLinksForAddress,
} from "@/lib/tournament-overview";
import type { Hole, Player, Round, Team } from "@/lib/types";

function shortRoundLabel(round: Round) {
  const name = round.name;
  if (/friday am/i.test(name)) return "Friday AM · Best Ball";
  if (/friday pm/i.test(name)) return "Friday PM · 2-Man Shamble";
  if (/saturday am/i.test(name)) return "Saturday AM · Scramble";
  if (/1v1|singles|match play/i.test(name)) {
    return `Singles · ${round.hole_count === 9 ? "9" : "18"} holes`;
  }
  if (/seeding/i.test(name)) return "Seeding";
  return name;
}

function shortPlayerName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
}

type YourMatchProps = {
  rounds: Round[];
  holes: Hole[];
  teams: Team[];
  players: Player[];
  sessionPlayerId: string;
  onGoToPlay: (roundId: string) => void;
};

/** Quick jump straight into the signed-in player's current live match. */
function YourMatchCard({
  rounds,
  holes,
  teams,
  players,
  sessionPlayerId,
  onGoToPlay,
}: YourMatchProps) {
  const roundIds = useMemo(() => rounds.map((r) => r.id), [rounds]);
  const { matches, scoresByRound } = useLiveMatches(roundIds);
  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => a.name.localeCompare(b.name)),
    [teams],
  );
  const [teamA, teamB] = sortedTeams;

  const nowPlaying = useMemo(() => {
    if (!sessionPlayerId) return null;
    const mine = matches
      .filter(
        (m) =>
          m.status === "pending" &&
          m.players.some((p) => p.player_id === sessionPlayerId),
      )
      .sort((a, b) => a.match_number - b.match_number);
    const match = mine[0];
    if (!match) return null;
    const round = rounds.find((r) => r.id === match.round_id) ?? null;
    if (!round || !teamA || !teamB) return null;
    const standing = calculateMatchPlayStanding({
      round,
      holes,
      sideA: match.players.filter((p) => p.team_id === teamA.id),
      sideB: match.players.filter((p) => p.team_id === teamB.id),
      sideSize: match.side_size,
      players,
      scoresByPlayer: scoresByRound[round.id] ?? {},
      teamAName: teamA.name,
      teamBName: teamB.name,
    });
    const opponents = match.players
      .filter((p) => p.player_id !== sessionPlayerId)
      .map(
        (p) =>
          players.find((pl) => pl.id === p.player_id)?.display_name ??
          "Unknown",
      );
    return { match, round, standing, opponents };
  }, [matches, sessionPlayerId, rounds, holes, players, scoresByRound, teamA, teamB]);

  if (!nowPlaying) return null;

  const { round, match, standing, opponents } = nowPlaying;
  const started = standing.holesPlayed > 0;
  const status = started
    ? compactMatchStatus({
        lead: standing.lead,
        holesPlayed: standing.holesPlayed,
        holesRemaining: standing.holesRemaining,
        finalResult: standing.finalResult,
        closedEarly: Boolean(standing.finalResult && !standing.complete),
      })
    : null;
  const aUp = standing.lead > 0;
  const bUp = standing.lead < 0;
  const leadColor = aUp
    ? teamAccentColor(teamA?.color, "gold")
    : bUp
      ? teamAccentColor(teamB?.color, "green")
      : undefined;

  return (
    <button
      type="button"
      onClick={() => onGoToPlay(round.id)}
      className="mt-4 w-full animate-rise rounded-3xl border border-pine/25 bg-white px-5 py-4 text-left shadow-[0_10px_30px_rgba(20,32,27,0.1)] transition hover:border-pine/50 hover:shadow-[0_12px_34px_rgba(20,32,27,0.14)]"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-[0.16em] text-fairway uppercase">
          Your match is on
        </p>
        <span className="shrink-0 rounded-full bg-pine px-3 py-1 text-xs font-semibold text-fog">
          Score it →
        </span>
      </div>
      <p className="mt-2 text-base font-semibold text-ink">
        {shortRoundLabel(round)} · Match {match.match_number}
      </p>
      <p className="mt-1 text-sm text-muted">
        vs {opponents.map(shortPlayerName).join(" & ") || "TBD"}
      </p>
      <p
        className="mt-2 text-sm font-semibold"
        style={{ color: started ? leadColor ?? "#14201b" : undefined }}
      >
        {started ? `${status} · thru ${standing.holesPlayed}` : "Not started yet"}
      </p>
    </button>
  );
}

function MapLinks({ address }: { address: string }) {
  const { apple, google } = mapsLinksForAddress(address);
  return (
    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
      <a
        href={apple}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-fairway underline-offset-2 hover:underline"
      >
        Apple Maps
      </a>
      <a
        href={google}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-fairway underline-offset-2 hover:underline"
      >
        Google Maps
      </a>
    </p>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-4 animate-fade rounded-3xl border border-ink/10 bg-white px-5 py-5 shadow-[0_6px_20px_rgba(20,32,27,0.07)]">
      <h2 className="text-xs font-semibold tracking-[0.16em] text-fairway uppercase">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

type HomeTabProps = {
  rounds: Round[];
  holes: Hole[];
  teams: Team[];
  players: Player[];
  sessionPlayerId: string;
  onGoToPlay: (roundId: string) => void;
};

export function HomeTab({
  rounds,
  holes,
  teams,
  players,
  sessionPlayerId,
  onGoToPlay,
}: HomeTabProps) {
  const [weather, setWeather] = useState<WeatherSnapshot | null>(null);
  const [weatherError, setWeatherError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const snap = await fetchSewaneeWeather();
        if (!cancelled) {
          setWeather(snap);
          setWeatherError("");
        }
      } catch {
        if (!cancelled) setWeatherError("Weather couldn’t load right now.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const theme = weather ? weatherSceneTheme(weather.weatherCode) : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-5 sm:px-5">
      {/* Brand + weekend */}
      <div className="atmosphere relative overflow-hidden rounded-3xl px-5 py-7 text-fog animate-rise ring-1 ring-white/10 shadow-[0_18px_44px_rgba(12,31,24,0.35)] sm:px-6 sm:py-8">
        <div className="relative flex items-start gap-4">
          <BrandLogo
            size={56}
            className="shrink-0 shadow-[0_6px_20px_rgba(0,0,0,0.3)] ring-2 ring-white/40"
          />
          <div className="min-w-0">
            <p className="text-xs tracking-[0.22em] text-mist/90 uppercase">
              Welcome
            </p>
            <h1 className="font-display mt-1 text-3xl leading-tight sm:text-4xl">
              The 2026 Cumberland Cup
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-white/12 px-3 py-1 text-xs font-medium text-fog ring-1 ring-white/20 backdrop-blur-sm">
                {WEEKEND_DATES}
              </span>
              <span className="inline-flex items-center rounded-full bg-gold/20 px-3 py-1 text-xs font-medium text-[#ecd9a8] ring-1 ring-gold/40 backdrop-blur-sm">
                {COURSE_ADDRESS.name}
              </span>
            </div>
          </div>
        </div>
      </div>

      <YourMatchCard
        rounds={rounds}
        holes={holes}
        teams={teams}
        players={players}
        sessionPlayerId={sessionPlayerId}
        onGoToPlay={onGoToPlay}
      />

      {/* Live weather */}
      <section
        className="relative mt-5 overflow-hidden rounded-3xl border border-ink/10 px-5 py-5 animate-fade shadow-[0_10px_30px_rgba(20,32,27,0.12)]"
        style={{ background: theme?.background ?? "#ffffff" }}
      >
        {theme ? <WeatherBackdrop kind={theme.kind} /> : null}
        <div className="relative">
          <div className="flex items-baseline justify-between gap-3">
            <h2
              className="text-xs font-semibold tracking-[0.16em] uppercase"
              style={{ color: theme?.heading }}
            >
              Local weather
            </h2>
            <p
              className="text-xs font-semibold tracking-wide"
              style={{ color: theme?.body ?? theme?.muted }}
            >
              {SEWANEE_COORDS.label}
            </p>
          </div>

          {weatherError ? (
            <p className="mt-3 text-sm text-muted">{weatherError}</p>
          ) : !weather || !theme ? (
            <p className="mt-3 text-sm text-muted">Loading conditions…</p>
          ) : (
            <>
              <div className="mt-3 flex items-end justify-between gap-4">
                <div>
                  <p
                    className="font-display text-5xl leading-none tabular-nums"
                    style={{ color: theme.body }}
                  >
                    {weather.temperature}°
                  </p>
                  <p
                    className="mt-1 text-sm font-medium"
                    style={{ color: theme.body }}
                  >
                    {weather.label}
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: theme.muted }}>
                    Feels like {weather.feelsLike}° · Wind {weather.windMph} mph ·{" "}
                    {weather.humidity}% humidity
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {weather.daily.map((day) => (
                  <div
                    key={day.date}
                    className="rounded-2xl px-3 py-2.5 backdrop-blur-sm"
                    style={{
                      backgroundColor: theme.chipBg,
                      border: `1px solid ${theme.chipBorder}`,
                    }}
                  >
                    <p
                      className="text-xs font-medium tracking-wide uppercase"
                      style={{ color: theme.muted }}
                    >
                      {formatForecastDay(day.date)}
                    </p>
                    <p
                      className="mt-1 text-sm font-semibold"
                      style={{ color: theme.body }}
                    >
                      {day.high}° / {day.low}°
                    </p>
                    <p
                      className="mt-0.5 truncate text-xs"
                      style={{ color: theme.muted }}
                    >
                      {day.label}
                    </p>
                    <p className="mt-0.5 text-xs" style={{ color: theme.muted }}>
                      {day.precipChance}% rain
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <Section title="Where">
        <p className="text-sm font-medium text-ink">{COURSE_ADDRESS.name}</p>
        <p className="text-sm text-muted">{COURSE_ADDRESS.line}</p>
        <MapLinks address={COURSE_ADDRESS.line} />
        <ul className="mt-4 space-y-3">
          {HOUSES.map((house) => (
            <li key={house.name} className="text-sm">
              <span className="font-medium text-ink">{house.name}</span>
              <br />
              <span className="text-muted">{house.line}</span>
              <MapLinks address={house.line} />
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Tee times">
        <div className="space-y-4">
          {TEE_TIMES.map((block) => (
            <div key={block.day}>
              <p className="text-sm font-semibold text-ink">{block.day}</p>
              <ul className="mt-1 space-y-1">
                {block.slots.map((slot) => (
                  <li key={slot} className="text-sm text-muted">
                    {slot}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Format">
        <div className="space-y-3">
          {COMPETITION.map((item) => (
            <div key={item.title}>
              <p className="text-sm font-semibold text-ink">{item.title}</p>
              <p className="mt-0.5 text-sm text-muted">{item.detail}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="How to win">
        <ul className="space-y-2">
          {CUP_RULES.map((rule) => (
            <li key={rule} className="text-sm text-muted">
              {rule}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Course rules">
        <ul className="space-y-2.5">
          {COURSE_RULES.map((rule) => (
            <li key={rule} className="text-sm leading-relaxed text-muted">
              {rule}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Social">
        <ul className="space-y-2">
          {SOCIAL.map((item) => (
            <li key={item.day} className="text-sm">
              <span className="font-medium text-ink">{item.day}</span>
              <span className="text-muted"> — {item.detail}</span>
            </li>
          ))}
        </ul>
        <ul className="mt-4 space-y-1.5 border-t border-ink/10 pt-3">
          {HOUSE_NOTES.map((note) => (
            <li key={note} className="text-sm text-muted">
              {note}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="The field">
        <div className="columns-2 gap-x-6 text-sm text-ink sm:columns-3">
          {ATTENDEES.map((name) => (
            <p key={name} className="mb-1.5 break-inside-avoid">
              {name}
            </p>
          ))}
        </div>
      </Section>

      <p className="mt-8 mb-2 text-center text-xs text-muted">
        From the 2026 Cumberland Cup Source of Truth
      </p>
    </div>
  );
}
