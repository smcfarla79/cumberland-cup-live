"use client";

import { BrandLogo } from "@/components/brand-logo";
import {
  INVITE_CHAMPIONS_LEFT,
  INVITE_CHAMPIONS_RIGHT,
  INVITE_CHAMPIONS_TITLE,
  INVITE_COPY,
  INVITE_HOST,
} from "@/lib/invite";
import { useEffect, useRef, useState } from "react";

type InviteRevealProps = {
  onContinue: () => void;
};

type Phase =
  | "sealed"
  | "cracking"
  | "unwrap"
  | "flap-open"
  | "rising"
  | "full"
  | "settled";

const PHASE_ORDER: { phase: Phase; delay: number }[] = [
  { phase: "sealed", delay: 0 },
  { phase: "cracking", delay: 900 },
  { phase: "unwrap", delay: 1650 },
  { phase: "flap-open", delay: 2850 },
  { phase: "rising", delay: 3900 },
  { phase: "full", delay: 4950 },
  { phase: "settled", delay: 5600 },
];

const PHASE_INDEX: Record<Phase, number> = {
  sealed: 0,
  cracking: 1,
  unwrap: 2,
  "flap-open": 3,
  rising: 4,
  full: 5,
  settled: 6,
};

export function InviteReveal({ onContinue }: InviteRevealProps) {
  const [phase, setPhase] = useState<Phase>("sealed");
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    timersRef.current = PHASE_ORDER.map(({ phase: p, delay }) =>
      window.setTimeout(() => setPhase(p), delay),
    );
    return () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current = [];
    };
  }, []);

  const idx = PHASE_INDEX[phase];
  const atLeast = (p: Phase) => idx >= PHASE_INDEX[p];
  const isDone = atLeast("settled");

  function clearPhaseTimers() {
    timersRef.current.forEach((t) => window.clearTimeout(t));
    timersRef.current = [];
  }

  /** Jump to the finished invite in place (for tapping the card mid-reveal). */
  function skipToEnd() {
    clearPhaseTimers();
    setPhase("settled");
  }

  return (
    <section className="invite-stage relative flex min-h-dvh flex-col items-center overflow-hidden px-4 py-8 text-ink">
      <div className="pointer-events-none absolute inset-0 invite-stage-bg" aria-hidden />

      {!atLeast("full") ? (
        <p className="invite-eyebrow relative z-10 mb-6 mt-4 text-center text-[11px] tracking-[0.28em] text-gold uppercase">
          You&apos;re invited
        </p>
      ) : null}

      {/* Envelope + rising card */}
      <div
        className={[
          "invite-frame relative z-10 w-full",
          atLeast("cracking") ? "is-cracked" : "",
          atLeast("unwrap") ? "is-unwrapped" : "",
          atLeast("flap-open") ? "is-open" : "",
          atLeast("rising") ? "is-risen" : "",
          atLeast("full") ? "is-full" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* Envelope body */}
        <div className="invite-envelope" aria-hidden>
          <div className="invite-envelope-back" />
          <div className="invite-flap-shadow" />
          <div className="invite-flap">
            <div className="invite-flap-liner" />
          </div>
          <div className="invite-envelope-front">
            <div className="invite-front-sheen" />
          </div>

          {/* Gold ribbon wrap — unties and flies away before the flap opens */}
          <div className="invite-ribbons">
            <div className="invite-ribbon-h invite-ribbon-h-l" />
            <div className="invite-ribbon-h invite-ribbon-h-r" />
            <div className="invite-ribbon-v" />
            <div className="invite-ribbon-tail invite-ribbon-tail-l" />
            <div className="invite-ribbon-tail invite-ribbon-tail-r" />
            <div className="invite-seal">
              <span className="invite-seal-half invite-seal-half-l">CC</span>
              <span className="invite-seal-half invite-seal-half-r">CC</span>
            </div>
          </div>
        </div>

        {/* Invitation card — starts tucked in the envelope, rises + scales to full page */}
        <article
          className="invite-card"
          role={isDone ? undefined : "button"}
          tabIndex={atLeast("full") && !isDone ? 0 : undefined}
          onClick={(e) => {
            e.stopPropagation();
            if (!atLeast("full")) return;
            if (isDone) onContinue();
            else skipToEnd();
          }}
        >
          <div className="invite-card-inner">
            <p className="invite-champions-title">{INVITE_CHAMPIONS_TITLE}</p>

            <div className="invite-champions-grid">
              <ul>
                {INVITE_CHAMPIONS_LEFT.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
              <ul>
                {INVITE_CHAMPIONS_RIGHT.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>
            <p className="invite-host">{INVITE_HOST}</p>

            <p className="invite-cordially">{INVITE_COPY.cordially}</p>

            <p className="invite-year">{INVITE_COPY.yearLine}</p>
            <p className="invite-event">{INVITE_COPY.eventName}</p>

            <p className="invite-details">
              {INVITE_COPY.toBeHeld}
              <br />
              {INVITE_COPY.dates}
              <br />
              {INVITE_COPY.months}
            </p>
            <p className="invite-address">
              {INVITE_COPY.addressLine1}
              <br />
              {INVITE_COPY.addressLine2}
            </p>

            <div className="invite-crest mt-4 flex justify-center">
              <BrandLogo size={68} className="ring-1 ring-[#c4a35a]/50" />
            </div>
          </div>
        </article>
      </div>

      {atLeast("full") ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onContinue();
          }}
          className={[
            "invite-cta relative z-20 mt-6 w-full max-w-xs rounded-2xl border px-4 py-3.5 text-sm font-semibold tracking-wide transition",
            isDone
              ? "border-gold bg-gold text-pine-deep hover:brightness-105"
              : "border-white/25 bg-white/10 text-mist/70",
          ].join(" ")}
        >
          Enter the Cup
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onContinue();
          }}
          className="invite-skip-hint relative z-10 mt-6 text-center text-xs text-mist/60 underline-offset-2 hover:text-mist hover:underline"
        >
          Skip animation
        </button>
      )}
    </section>
  );
}
