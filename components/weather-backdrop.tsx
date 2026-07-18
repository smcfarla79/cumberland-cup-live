"use client";

import type { WeatherSceneKind } from "@/lib/sewanee-weather";

/** Decorative sky layer for the Home weather card. */
export function WeatherBackdrop({ kind }: { kind: WeatherSceneKind }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {kind === "clear" ? (
        <div
          className="absolute right-4 top-3 h-16 w-16 rounded-full bg-[#ffe566] opacity-90 shadow-[0_0_40px_18px_rgba(255,220,80,0.55)]"
        />
      ) : null}

      {kind === "partly" ? (
        <>
          <div className="absolute right-5 top-3 h-12 w-12 rounded-full bg-[#ffe566] opacity-85 shadow-[0_0_28px_12px_rgba(255,220,80,0.4)]" />
          <Cloud className="absolute right-2 top-7 scale-90 opacity-90" />
          <Cloud className="absolute right-16 top-4 scale-75 opacity-70" />
        </>
      ) : null}

      {kind === "overcast" || kind === "fog" ? (
        <>
          <Cloud className="absolute -left-4 top-2 scale-110 opacity-80" />
          <Cloud className="absolute right-0 top-5 scale-100 opacity-75" />
          <Cloud className="absolute left-1/3 top-0 scale-90 opacity-60" />
        </>
      ) : null}

      {kind === "rain" || kind === "storm" ? (
        <>
          <Cloud className="absolute -left-2 top-1 scale-110 opacity-85" dark />
          <Cloud className="absolute right-0 top-3 scale-100 opacity-80" dark />
          <RainLines storm={kind === "storm"} />
        </>
      ) : null}

      {kind === "snow" ? (
        <>
          <Cloud className="absolute right-2 top-2 scale-100 opacity-80" />
          <Cloud className="absolute -left-3 top-5 scale-90 opacity-70" />
          <SnowDots />
        </>
      ) : null}
    </div>
  );
}

function Cloud({
  className = "",
  dark = false,
}: {
  className?: string;
  dark?: boolean;
}) {
  const fill = dark ? "rgba(55,65,80,0.55)" : "rgba(255,255,255,0.78)";
  return (
    <div className={className}>
      <svg width="120" height="48" viewBox="0 0 120 48" fill="none">
        <ellipse cx="38" cy="28" rx="28" ry="16" fill={fill} />
        <ellipse cx="62" cy="22" rx="24" ry="18" fill={fill} />
        <ellipse cx="88" cy="30" rx="22" ry="14" fill={fill} />
      </svg>
    </div>
  );
}

function RainLines({ storm = false }: { storm?: boolean }) {
  const drops = [12, 28, 44, 60, 76, 92, 108, 124, 140, 156];
  return (
    <svg
      className="absolute inset-x-0 bottom-0 top-10 h-[70%] w-full opacity-50"
      viewBox="0 0 200 100"
      preserveAspectRatio="none"
    >
      {drops.map((x, i) => (
        <line
          key={x}
          x1={x}
          y1={i % 2 === 0 ? 5 : 15}
          x2={x - 4}
          y2={95}
          stroke={storm ? "rgba(180,200,255,0.55)" : "rgba(220,235,245,0.65)"}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

function SnowDots() {
  const flakes = [
    [20, 30],
    [45, 55],
    [70, 25],
    [95, 60],
    [120, 35],
    [145, 50],
    [170, 28],
    [35, 70],
    [110, 75],
  ];
  return (
    <svg
      className="absolute inset-0 h-full w-full opacity-70"
      viewBox="0 0 200 100"
      preserveAspectRatio="none"
    >
      {flakes.map(([x, y], i) => (
        <circle
          key={`${x}-${y}`}
          cx={x}
          cy={y}
          r={i % 3 === 0 ? 2.2 : 1.5}
          fill="rgba(255,255,255,0.9)"
        />
      ))}
    </svg>
  );
}
