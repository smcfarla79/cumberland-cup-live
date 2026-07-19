"use client";

import { BrandLogo } from "@/components/brand-logo";
import type { Round } from "@/lib/types";

type RoundPickerProps = {
  playerName: string;
  rounds: Round[];
  onSelect: (round: Round) => void;
  onOpenDraft: () => void;
  onOpenBoard: () => void;
  onSignOut: () => void;
};

export function RoundPicker({
  playerName,
  rounds,
  onSelect,
  onOpenDraft,
  onOpenBoard,
  onSignOut,
}: RoundPickerProps) {
  return (
    <section className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-10">
      <header className="animate-rise">
        <div className="flex items-start justify-between gap-4">
          <div>
            <BrandLogo size={72} className="mb-5 ring-1 ring-mist" />
            <h1 className="font-display text-4xl text-ink">
              Hello, {playerName.split(" ")[0]}
            </h1>
            <p className="mt-3 text-muted">
              Score a round, set teams, or watch the live board.
            </p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="shrink-0 rounded-full border border-mist bg-white/70 px-3 py-1.5 text-xs font-medium text-muted transition hover:border-fairway/40 hover:text-ink"
          >
            Switch player
          </button>
        </div>
      </header>

      <div className="mt-8 grid gap-3 animate-rise">
        <button
          type="button"
          onClick={onOpenBoard}
          className="w-full rounded-2xl border border-pine bg-pine px-5 py-4 text-left text-fog shadow-[0_8px_22px_rgba(12,31,24,0.3)] transition hover:brightness-110"
        >
          <span className="block text-xs tracking-wide text-gold uppercase">
            Spectator
          </span>
          <span className="mt-1 block text-base font-semibold">Live board</span>
        </button>
        <button
          type="button"
          onClick={onOpenDraft}
          className="w-full rounded-2xl border border-mist bg-white px-5 py-4 text-left shadow-[0_4px_14px_rgba(20,32,27,0.06)] transition hover:border-fairway hover:shadow-[0_6px_18px_rgba(20,32,27,0.1)]"
        >
          <span className="block text-xs tracking-wide text-fairway uppercase">
            Draft night
          </span>
          <span className="mt-1 block text-base font-semibold text-ink">
            Assign Team A &amp; Team B
          </span>
        </button>
      </div>

      <ul className="mt-6 space-y-3 animate-fade">
        {rounds.map((round) => (
          <li key={round.id}>
            <button
              type="button"
              onClick={() => onSelect(round)}
              className="w-full rounded-2xl border border-mist bg-white px-5 py-4 text-left shadow-[0_4px_14px_rgba(20,32,27,0.06)] transition hover:border-fairway hover:shadow-[0_6px_18px_rgba(20,32,27,0.1)]"
            >
              <span className="block text-xs tracking-wide text-fairway uppercase">
                Day {round.day_number}
                {round.play_date ? ` · ${round.play_date}` : ""}
                {" · "}
                {round.scoring_format}
              </span>
              <span className="mt-1 block text-base font-medium text-ink">
                {round.name}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
