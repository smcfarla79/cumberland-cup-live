import type { AppTab } from "@/lib/types";

/** Left-to-right order used by the header and edge-swipe navigation. */
export const APP_TABS: { id: AppTab; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "cup", label: "Cup" },
  { id: "play", label: "Play" },
  { id: "teams", label: "Teams" },
  { id: "course", label: "Card" },
  { id: "grill", label: "Grill" },
];

export const APP_TAB_ORDER: AppTab[] = APP_TABS.map((tab) => tab.id);
