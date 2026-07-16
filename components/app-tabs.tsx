"use client";

import type { AppTab } from "@/lib/types";

const TABS: { id: AppTab; label: string }[] = [
  { id: "teams", label: "Teams" },
  { id: "matches", label: "Matches" },
  { id: "cup", label: "Cup" },
  { id: "score", label: "Score" },
  { id: "course", label: "Card" },
];

type AppTabsProps = {
  active: AppTab;
  onChange: (tab: AppTab) => void;
  playerName: string;
  onSignOut: () => void;
};

export function AppTabs({ active, onChange, playerName, onSignOut }: AppTabsProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-mist/80 bg-fog/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 pt-4">
        <div>
          <p className="text-[11px] tracking-[0.18em] text-fairway uppercase">
            Cumberland Cup
          </p>
          <p className="text-sm text-ink">{playerName}</p>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
        >
          Switch
        </button>
      </div>
      <nav
        className="mx-auto mt-3 flex max-w-2xl gap-1 px-2 pb-2"
        aria-label="Main"
      >
        {TABS.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={[
                "flex-1 px-2 py-2.5 text-sm font-medium transition",
                isActive
                  ? "border-b-2 border-pine text-pine"
                  : "border-b-2 border-transparent text-muted hover:text-ink",
              ].join(" ")}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
