"use client";

import { useEffect, useState, type ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import {
  fetchSewaneeWeather,
  formatForecastDay,
  SEWANEE_COORDS,
  type WeatherSnapshot,
} from "@/lib/sewanee-weather";
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
} from "@/lib/tournament-overview";

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-8 animate-fade">
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

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-5 sm:px-5">
      {/* Brand + weekend */}
      <div className="atmosphere relative overflow-hidden px-4 py-7 text-fog animate-rise sm:px-6 sm:py-8">
        <div className="relative flex items-start gap-4">
          <BrandLogo size={56} className="shrink-0 ring-1 ring-white/25" />
          <div className="min-w-0">
            <p className="text-[10px] tracking-[0.22em] text-mist/80 uppercase">
              Welcome
            </p>
            <h1 className="font-display mt-1 text-3xl leading-tight sm:text-4xl">
              The Cumberland Cup
            </h1>
            <p className="mt-2 text-sm text-mist/90">{WEEKEND_DATES}</p>
            <p className="mt-1 text-sm text-mist/75">{COURSE_ADDRESS.name}</p>
          </div>
        </div>
      </div>

      {/* Live weather */}
      <section className="mt-5 border border-ink/15 bg-white px-4 py-4 animate-fade">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xs font-semibold tracking-[0.16em] text-fairway uppercase">
            Local weather
          </h2>
          <p className="text-[11px] text-muted">{SEWANEE_COORDS.label}</p>
        </div>

        {weatherError ? (
          <p className="mt-3 text-sm text-muted">{weatherError}</p>
        ) : !weather ? (
          <p className="mt-3 text-sm text-muted">Loading conditions…</p>
        ) : (
          <>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <p className="font-display text-5xl leading-none tabular-nums text-ink">
                  {weather.temperature}°
                </p>
                <p className="mt-1 text-sm font-medium text-ink">{weather.label}</p>
                <p className="mt-0.5 text-xs text-muted">
                  Feels like {weather.feelsLike}° · Wind {weather.windMph} mph ·{" "}
                  {weather.humidity}% humidity
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {weather.daily.map((day) => (
                <div
                  key={day.date}
                  className="border border-ink/10 bg-fog/60 px-2.5 py-2"
                >
                  <p className="text-[10px] tracking-wide text-muted uppercase">
                    {formatForecastDay(day.date)}
                  </p>
                  <p className="mt-1 text-sm font-medium text-ink">
                    {day.high}° / {day.low}°
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-muted">
                    {day.label}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted">
                    {day.precipChance}% rain
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <Section title="Where">
        <p className="text-sm font-medium text-ink">{COURSE_ADDRESS.name}</p>
        <p className="text-sm text-muted">{COURSE_ADDRESS.line}</p>
        <ul className="mt-3 space-y-2">
          {HOUSES.map((house) => (
            <li key={house.name} className="text-sm">
              <span className="font-medium text-ink">{house.name}</span>
              <span className="text-muted"> · {house.note}</span>
              <br />
              <span className="text-muted">{house.line}</span>
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
