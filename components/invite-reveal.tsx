"use client";

import { BrandLogo } from "@/components/brand-logo";
import {
  INVITE_CHAMPIONS_LEFT,
  INVITE_CHAMPIONS_RIGHT,
  INVITE_CHAMPIONS_TITLE,
  INVITE_COPY,
  INVITE_HOST,
} from "@/lib/invite";
import { useEffect, useState } from "react";

type InviteRevealProps = {
  onContinue: () => void;
};

type Phase = "closed" | "opening" | "open";

export function InviteReveal({ onContinue }: InviteRevealProps) {
  const [phase, setPhase] = useState<Phase>("closed");

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase("opening"), 450);
    const t2 = window.setTimeout(() => setPhase("open"), 1600);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  const opened = phase === "opening" || phase === "open";

  return (
    <section className="invite-stage relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10 text-ink">
      <div className="pointer-events-none absolute inset-0 invite-stage-bg" aria-hidden />

      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <p className="mb-6 text-center text-[11px] tracking-[0.28em] text-gold uppercase">
          You&apos;re invited
        </p>

        <div
          className={[
            "invite-scene relative w-full",
            opened ? "is-open" : "",
            phase === "open" ? "is-revealed" : "",
          ].join(" ")}
        >
          {/* Ribbons */}
          <div className="invite-ribbon invite-ribbon-a" aria-hidden />
          <div className="invite-ribbon invite-ribbon-b" aria-hidden />
          <div className="invite-ribbon invite-ribbon-c" aria-hidden />

          {/* Envelope back */}
          <div className="invite-envelope-back" aria-hidden />

          {/* Card */}
          <article
            className="invite-card"
            role={phase === "open" ? "button" : undefined}
            tabIndex={phase === "open" ? 0 : undefined}
            onClick={phase === "open" ? onContinue : undefined}
            onKeyDown={
              phase === "open"
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") onContinue();
                  }
                : undefined
            }
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

              <p className="invite-host">
                <span className="invite-script">{INVITE_HOST}</span>
                <br />
                {INVITE_COPY.cordially}
                <br />
                {INVITE_COPY.toParticipate}
              </p>

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

              <div className="invite-seal mt-4 flex justify-center">
                <BrandLogo size={72} className="ring-1 ring-[#c4a35a]/50" />
              </div>
            </div>
          </article>

          {/* Envelope flap + front */}
          <div className="invite-flap" aria-hidden />
          <div className="invite-envelope-front" aria-hidden>
            <span className="invite-wax">CC</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onContinue}
          disabled={phase !== "open"}
          className={[
            "mt-8 w-full max-w-xs border px-4 py-3.5 text-sm font-semibold tracking-wide transition",
            phase === "open"
              ? "border-gold bg-gold text-pine-deep hover:brightness-105"
              : "border-white/20 bg-white/10 text-mist/50",
          ].join(" ")}
        >
          {phase === "open" ? "Enter the Cup" : "Opening…"}
        </button>

        {phase === "open" ? (
          <button
            type="button"
            onClick={onContinue}
            className="mt-3 text-xs text-mist/80 underline-offset-2 hover:text-fog hover:underline"
          >
            Tap to continue
          </button>
        ) : null}
      </div>
    </section>
  );
}
