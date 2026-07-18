"use client";

import { BrandLogo } from "@/components/brand-logo";
import type { Player } from "@/lib/types";

type PlayerPickerProps = {
  players: Player[];
  onSelect: (player: Player) => void;
};

export function PlayerPicker({ players, onSelect }: PlayerPickerProps) {
  return (
    <section className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-10">
      <div className="animate-rise">
        <BrandLogo size={88} className="mb-6 ring-1 ring-mist" />
        <p className="text-sm tracking-[0.18em] text-fairway uppercase">Who are you?</p>
        <h1 className="font-display mt-2 text-4xl text-ink">Pick your name</h1>
        <p className="mt-3 text-muted">
          You’ll only be able to enter scores for yourself. We remember your
          pick on this device for next time.
        </p>
      </div>

      <ul className="mt-8 grid gap-2 animate-fade">
        {players.map((player) => (
          <li key={player.id}>
            <button
              type="button"
              onClick={() => onSelect(player)}
              className="w-full border border-mist bg-white px-4 py-3.5 text-left text-base text-ink transition hover:border-fairway hover:bg-fog"
            >
              {player.display_name}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
