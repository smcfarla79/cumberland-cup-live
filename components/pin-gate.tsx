"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type PinGateProps = {
  tournamentName: string;
  expectedPin: string;
  onSuccess: () => void;
};

/** Drone clip from last year’s tournament video (4:45–4:53). */
const YT_VIDEO_ID = "JpsPHaHRkBA";
const CLIP_START_SEC = 4 * 60 + 45; // 4:45
const CLIP_END_SEC = 4 * 60 + 53; // 4:53

function PinDroneBackground() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [origin, setOrigin] = useState("");
  const [localFailed, setLocalFailed] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const embedSrc = useMemo(() => {
    const params = new URLSearchParams({
      autoplay: "1",
      mute: "1",
      controls: "0",
      disablekb: "1",
      fs: "0",
      iv_load_policy: "3",
      modestbranding: "1",
      playsinline: "1",
      rel: "0",
      start: String(CLIP_START_SEC),
      end: String(CLIP_END_SEC),
      loop: "1",
      playlist: YT_VIDEO_ID,
      enablejsapi: "1",
    });
    if (origin) params.set("origin", origin);
    return `https://www.youtube-nocookie.com/embed/${YT_VIDEO_ID}?${params.toString()}`;
  }, [origin]);

  // Re-seek when the clip hits the end (YouTube loop often restarts from 0).
  useEffect(() => {
    if (!origin) return;

    const seekAndPlay = () => {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      win.postMessage(
        JSON.stringify({
          event: "command",
          func: "seekTo",
          args: [CLIP_START_SEC, true],
        }),
        "*",
      );
      win.postMessage(
        JSON.stringify({ event: "command", func: "mute", args: [] }),
        "*",
      );
      win.postMessage(
        JSON.stringify({ event: "command", func: "playVideo", args: [] }),
        "*",
      );
    };

    const id = window.setInterval(seekAndPlay, CLIP_END_SEC - CLIP_START_SEC);
    const kick = window.setTimeout(seekAndPlay, 800);

    return () => {
      window.clearInterval(id);
      window.clearTimeout(kick);
    };
  }, [origin]);

  function kickPlayback() {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage(
      JSON.stringify({
        event: "command",
        func: "seekTo",
        args: [CLIP_START_SEC, true],
      }),
      "*",
    );
    win.postMessage(
      JSON.stringify({ event: "command", func: "mute", args: [] }),
      "*",
    );
    win.postMessage(
      JSON.stringify({ event: "command", func: "playVideo", args: [] }),
      "*",
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden bg-pine-deep" aria-hidden>
      {/* Optional local assets — drop public/pin-drone.mp4 later */}
      {!localFailed ? (
        <video
          className="pointer-events-none absolute inset-0 z-[1] h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onError={() => setLocalFailed(true)}
        >
          <source src="/pin-drone.mp4" type="video/mp4" />
        </video>
      ) : null}

      {origin ? (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[56.25vw] min-h-full w-full min-w-[177.78vh] -translate-x-1/2 -translate-y-1/2">
          <iframe
            ref={iframeRef}
            title="Cumberland Cup drone background"
            src={embedSrc}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            className="h-full w-full border-0"
          />
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-0 z-[2] bg-pine-deep/30" />
      <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-pine-deep/75 via-transparent to-pine-deep/35" />

      {/* iOS often needs a tap before YouTube autoplay starts */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        className="absolute inset-0 z-[3] cursor-default"
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

      <div className="relative z-10 mx-auto w-full max-w-md animate-rise bg-pine-deep/50 px-5 py-8 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-md ring-1 ring-white/15">
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
              className="w-full border border-white/25 bg-black/40 px-4 py-3.5 text-lg tracking-[0.35em] text-fog outline-none transition focus:border-gold"
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
