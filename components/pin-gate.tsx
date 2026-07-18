"use client";

import { BrandLogo } from "@/components/brand-logo";
import { useEffect, useRef, useState } from "react";

type PinGateProps = {
  tournamentName: string;
  expectedPin: string;
  onSuccess: () => void;
};

/** Drone clip from last year’s tournament video (4:45–4:53). */
const YT_VIDEO_ID = "JpsPHaHRkBA";
const CLIP_START_SEC = 4 * 60 + 45; // 4:45
const CLIP_END_SEC = 4 * 60 + 53; // 4:53

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: Record<string, unknown>,
      ) => YtPlayer;
      PlayerState: { PLAYING: number; ENDED: number; PAUSED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type YtPlayer = {
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  destroy: () => void;
};

function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();

  return new Promise((resolve) => {
    const prior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prior?.();
      resolve();
    };
    if (!document.getElementById("youtube-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });
}

function PinDroneBackground() {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YtPlayer | null>(null);
  const pollRef = useRef<number | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        await loadYouTubeApi();
        if (cancelled || !hostRef.current || !window.YT) return;

        const player = new window.YT.Player(hostRef.current, {
          videoId: YT_VIDEO_ID,
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            start: CLIP_START_SEC,
            // end is honored on first play; we re-seek for the loop
            end: CLIP_END_SEC,
          },
          events: {
            onReady: (event: { target: YtPlayer }) => {
              if (cancelled) return;
              playerRef.current = event.target;
              event.target.seekTo(CLIP_START_SEC, true);
              event.target.playVideo();
              setReady(true);

              pollRef.current = window.setInterval(() => {
                const p = playerRef.current;
                if (!p) return;
                try {
                  const t = p.getCurrentTime();
                  if (t >= CLIP_END_SEC - 0.15 || t < CLIP_START_SEC - 0.5) {
                    p.seekTo(CLIP_START_SEC, true);
                    p.playVideo();
                  }
                } catch {
                  /* player may be mid-destroy */
                }
              }, 250);
            },
            onStateChange: (event: { data: number; target: YtPlayer }) => {
              if (!window.YT) return;
              if (
                event.data === window.YT.PlayerState.ENDED ||
                event.data === window.YT.PlayerState.PAUSED
              ) {
                event.target.seekTo(CLIP_START_SEC, true);
                event.target.playVideo();
              }
            },
            onError: () => {
              if (!cancelled) setFailed(true);
            },
          },
        });
        playerRef.current = player;
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      if (pollRef.current != null) window.clearInterval(pollRef.current);
      try {
        playerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Cover crop so 16:9 fills portrait phones */}
      <div className="absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-full min-w-[177.78vh] -translate-x-1/2 -translate-y-1/2">
        <div
          ref={hostRef}
          className={[
            "h-full w-full transition-opacity duration-700",
            ready && !failed ? "opacity-100" : "opacity-0",
          ].join(" ")}
        />
      </div>
      {/* Readability overlays */}
      <div className="absolute inset-0 bg-pine-deep/55" />
      <div className="absolute inset-0 bg-gradient-to-t from-pine-deep via-pine-deep/40 to-pine-deep/30" />
      {!failed ? null : (
        <div className="atmosphere absolute inset-0" />
      )}
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

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.45'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative mx-auto w-full max-w-md animate-rise">
        <div className="mb-8 flex justify-center sm:justify-start">
          <BrandLogo
            size={176}
            priority
            className="shadow-[0_12px_40px_rgba(0,0,0,0.4)] ring-2 ring-white/40"
          />
        </div>
        <p className="text-sm tracking-[0.22em] text-gold uppercase">
          Sewanee · 2026
        </p>
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
              className="w-full border border-white/20 bg-black/35 px-4 py-3.5 text-lg tracking-[0.35em] text-fog outline-none backdrop-blur-sm transition focus:border-gold"
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
