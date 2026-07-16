"use client";

import type { Round } from "@/lib/types";

type RoundPickerProps = {
  playerName: string;
  rounds: Round[];
  onSelect: (round: Round) => void;
  onOpenDraft: () => void;
  onSignOut: () => void;
};

export function RoundPicker({
  playerName,
  rounds,
  onSelect,
  onOpenDraft,
  onSignOut,
}: RoundPickerProps) {
  return (
    <section className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-10">
      <header className="animate-rise">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm tracking-[0.18em] text-fairway uppercase">
              Cumberland Cup
            </p>
            <h1 className="font-display mt-2 text-4xl text-ink">
              Hello, {playerName.split(" ")[0]}
            </h1>
            <p className="mt-3 text-muted">
              Choose a round to score, or set teams after the draft.
            </p>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="shrink-0 text-sm text-muted underline-offset-2 hover:text-ink hover:underline"
          >
            Switch player
          </button>
        </div>
      </header>

      <button
        type="button"
        onClick={onOpenDraft}
        className="mt-8 w-full border border-pine bg-pine px-4 py-4 text-left text-fog transition hover:brightness-110 animate-rise"
      >
        <span className="block text-xs tracking-wide text-gold uppercase">
          Draft night
        </span>
        <span className="mt-1 block text-base font-semibold">
          Assign Team A &amp; Team B
        </span>
      </button>

      <ul className="mt-6 space-y-3 animate-fade">
        {rounds.map((round) => (
          <li key={round.id}>
            <button
              type="button"
              onClick={() => onSelect(round)}
              className="w-full border border-mist bg-white px-4 py-4 text-left transition hover:border-fairway"
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
