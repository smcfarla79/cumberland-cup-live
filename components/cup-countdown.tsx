"use client";

import { useEffect, useState } from "react";
import { TOURNAMENT_START_MS } from "@/lib/tournament-overview";

type Remaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function remainingUntil(nowMs: number, endMs: number): Remaining | null {
  const ms = endMs - nowMs;
  if (ms <= 0) return null;
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { days, hours, minutes, seconds };
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-0 flex-1 text-center">
      <p className="font-display text-3xl leading-none tabular-nums text-ink sm:text-4xl">
        {String(value).padStart(2, "0")}
      </p>
      <p className="mt-1.5 text-[10px] font-semibold tracking-[0.16em] text-muted uppercase">
        {label}
      </p>
    </div>
  );
}

/** Live countdown to Thursday’s tournament open; unmounts once that day starts. */
export function CupCountdown() {
  // null until mounted (avoids SSR/client clock mismatch); then Remaining | null
  const [remaining, setRemaining] = useState<Remaining | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function tick() {
      setRemaining(remainingUntil(Date.now(), TOURNAMENT_START_MS));
      setReady(true);
    }
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!ready || !remaining) return null;

  return (
    <section
      className="mt-5 rounded-3xl border border-ink/10 bg-white px-5 py-5 shadow-[0_6px_20px_rgba(20,32,27,0.07)] animate-fade"
      aria-live="polite"
      aria-atomic="true"
    >
      <p className="text-xs font-semibold tracking-[0.16em] text-fairway uppercase">
        Countdown to the Cup
      </p>
      <p className="mt-1 text-sm text-muted">
        Until Thursday, July 30 · Sewanee time
      </p>
      <div className="mt-4 flex items-start gap-1 sm:gap-2">
        <Unit value={remaining.days} label="Days" />
        <span
          className="mt-1 font-display text-2xl text-mist select-none"
          aria-hidden
        >
          :
        </span>
        <Unit value={remaining.hours} label="Hours" />
        <span
          className="mt-1 font-display text-2xl text-mist select-none"
          aria-hidden
        >
          :
        </span>
        <Unit value={remaining.minutes} label="Min" />
        <span
          className="mt-1 font-display text-2xl text-mist select-none"
          aria-hidden
        >
          :
        </span>
        <Unit value={remaining.seconds} label="Sec" />
      </div>
    </section>
  );
}
