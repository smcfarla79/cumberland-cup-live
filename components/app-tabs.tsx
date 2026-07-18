"use client";

import { BrandLogo } from "@/components/brand-logo";
import type { AppTab } from "@/lib/types";

const TABS: { id: AppTab; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "cup", label: "Cup" },
  { id: "play", label: "Play" },
  { id: "teams", label: "Teams" },
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
        <div className="flex min-w-0 items-center gap-3">
          <BrandLogo size={40} className="shrink-0 ring-1 ring-mist" />
          <div className="min-w-0">
            <p className="truncate text-[11px] tracking-[0.18em] text-fairway uppercase">
              Cumberland Cup
            </p>
            <p className="truncate text-sm text-ink">{playerName}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="shrink-0 text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
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
                "flex-1 px-1.5 py-2.5 text-[13px] font-medium transition sm:px-2 sm:text-sm",
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
