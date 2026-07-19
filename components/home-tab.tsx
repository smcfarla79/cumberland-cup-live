"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import {
  fetchSewaneeWeather,
  formatForecastDay,
  SEWANEE_COORDS,
  weatherSceneTheme,
  type WeatherSnapshot,
} from "@/lib/sewanee-weather";
import { WeatherBackdrop } from "@/components/weather-backdrop";
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

export function HomeTab() {
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
            <p className="text-[10px] tracking-[0.22em] text-mist/80 uppercase">
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
              className="text-[11px] font-semibold tracking-wide"
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
                      className="text-[10px] tracking-wide uppercase"
                      style={{ color: theme.muted }}
                    >
                      {formatForecastDay(day.date)}
                    </p>
                    <p
                      className="mt-1 text-sm font-medium"
                      style={{ color: theme.body }}
                    >
                      {day.high}° / {day.low}°
                    </p>
                    <p
                      className="mt-0.5 truncate text-[11px]"
                      style={{ color: theme.muted }}
                    >
                      {day.label}
                    </p>
                    <p className="mt-0.5 text-[10px]" style={{ color: theme.muted }}>
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

      <p className="mt-8 mb-2 text-center text-[11px] text-muted">
        From the 2026 Cumberland Cup Source of Truth
      </p>
    </div>
  );
}
