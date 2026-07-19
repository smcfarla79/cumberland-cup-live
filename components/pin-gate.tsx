"use client";

import { useEffect, useRef, useState } from "react";

type PinGateProps = {
  tournamentName: string;
  expectedPin: string;
  onSuccess: () => void;
};

function PinDroneBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    void video.play().catch(() => {
      /* iOS may require a tap — handled below */
    });
  }, []);

  function kickPlayback() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    void video.play().catch(() => {});
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-pine-deep" aria-hidden>
      <video
        ref={videoRef}
        className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        src="/pin-drone.mp4"
      />

      <div className="pointer-events-none absolute inset-0 z-[1] bg-pine-deep/30" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-pine-deep/75 via-transparent to-pine-deep/35" />

      {/* iOS sometimes needs a tap before muted autoplay starts */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        className="absolute inset-0 z-[2] cursor-default"
        onClick={kickPlayback}
        onTouchStart={kickPlayback}
      />
    </div>
  );
}

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
    <section className="relative flex min-h-dvh flex-col justify-end overflow-hidden px-6 pb-12 pt-16 text-fog sm:justify-center sm:pb-0">
      <PinDroneBackground />

      <div className="relative z-10 mx-auto w-full max-w-md animate-rise rounded-3xl bg-pine-deep/50 px-6 py-8 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-md ring-1 ring-white/15">
        <p className="text-sm tracking-[0.22em] text-gold uppercase">
          The Cumberland Cup · 2026
        </p>
        <h1 className="font-display mt-3 text-4xl leading-tight text-fog">
          Enter the weekend
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-mist/90">
          Live scoring for {tournamentName}. Enter the weekend PIN to continue.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm text-mist/80">Weekend PIN</span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="w-full rounded-2xl border border-white/25 bg-black/40 px-4 py-3.5 text-lg tracking-[0.35em] text-fog outline-none transition focus:border-gold"
              placeholder="••••"
              aria-label="Weekend PIN"
            />
          </label>
          {error ? <p className="text-sm text-red-200">{error}</p> : null}
          <button
            type="submit"
            className="w-full rounded-2xl bg-gold px-4 py-3.5 text-sm font-semibold tracking-wide text-pine-deep shadow-[0_6px_18px_rgba(196,163,90,0.35)] transition hover:brightness-105 active:scale-[0.99]"
          >
            Enter the Cup
          </button>
        </form>
      </div>
    </section>
  );
}
