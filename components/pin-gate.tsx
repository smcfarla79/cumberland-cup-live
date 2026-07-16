"use client";

import { useState } from "react";

type PinGateProps = {
  tournamentName: string;
  expectedPin: string;
  onSuccess: () => void;
};

export function PinGate({ tournamentName, expectedPin, onSuccess }: PinGateProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.trim() === expectedPin) {
      setError("");
      onSuccess();
      return;
    }
    setError("That PIN doesn’t match. Try again.");
  }

  return (
    <section className="atmosphere relative flex min-h-dvh flex-col justify-end overflow-hidden px-6 pb-12 pt-16 text-fog sm:justify-center sm:pb-0">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.45'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative mx-auto w-full max-w-md animate-rise">
        <p className="mb-3 text-sm tracking-[0.22em] text-gold uppercase">
          Sewanee · 2026
        </p>
        <h1 className="font-display text-5xl leading-none text-fog sm:text-6xl">
          Cumberland Cup
        </h1>
        <p className="mt-4 max-w-sm text-base leading-relaxed text-mist/90">
          Live scoring for {tournamentName}. Enter the weekend PIN to continue.
        </p>

        <form onSubmit={submit} className="mt-10 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-mist/80">Weekend PIN</span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full border border-white/20 bg-white/10 px-4 py-3.5 text-lg tracking-[0.35em] text-fog outline-none backdrop-blur-sm transition focus:border-gold"
              placeholder="••••"
              aria-label="Weekend PIN"
            />
          </label>
          {error ? <p className="text-sm text-red-200">{error}</p> : null}
          <button
            type="submit"
            className="w-full bg-gold px-4 py-3.5 text-sm font-semibold tracking-wide text-pine-deep transition hover:brightness-105"
          >
            Enter the Cup
          </button>
        </form>
      </div>
    </section>
  );
}
