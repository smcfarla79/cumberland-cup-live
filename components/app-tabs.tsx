"use client";

import { BrandLogo } from "@/components/brand-logo";
import { APP_TABS } from "@/lib/app-tabs";
import type { AppTab } from "@/lib/types";

type AppTabsProps = {
  active: AppTab;
  onChange: (tab: AppTab) => void;
  playerName: string;
  onSignOut: () => void;
};

export function AppTabs({ active, onChange, playerName, onSignOut }: AppTabsProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-mist/60 bg-fog/85 shadow-[0_1px_12px_rgba(20,32,27,0.06)] backdrop-blur-md">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 pt-3.5">
        <div className="flex min-w-0 items-center gap-3">
          <BrandLogo size={40} className="shrink-0 ring-1 ring-mist" />
          <div className="min-w-0">
            <p className="truncate text-[11px] tracking-[0.18em] text-fairway uppercase">
              Cumberland Cup
            </p>
            <p className="truncate text-sm font-medium text-ink">{playerName}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="shrink-0 rounded-full border border-mist bg-white/70 px-3 py-1.5 text-xs font-medium text-muted transition hover:border-fairway/40 hover:text-ink"
        >
          Switch player
        </button>
      </div>
      <div className="mx-auto max-w-2xl px-4 pb-2.5">
        <nav
          className="mt-3 flex gap-1 rounded-full border border-mist/70 bg-mist/40 p-1 shadow-inner"
          aria-label="Main"
        >
          {APP_TABS.map((tab) => {
            const isActive = tab.id === active;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChange(tab.id)}
                className={[
                  "flex-1 rounded-full px-1 py-2 text-[12px] font-medium transition-all duration-200 sm:px-2 sm:text-sm",
                  isActive
                    ? "bg-pine text-fog shadow-[0_2px_8px_rgba(12,31,24,0.35)]"
                    : "text-muted hover:bg-white/60 hover:text-ink",
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
