"use client";

import { useRef } from "react";
import { APP_TAB_ORDER } from "@/lib/app-tabs";
import type { AppTab } from "@/lib/types";

/** How far from the screen edge a swipe must begin (px). */
const EDGE_PX = 36;
/** Minimum horizontal travel to count as a tab change (px). */
const MIN_SWIPE_PX = 56;
/** Ignore if the gesture is more vertical than this ratio of horizontal. */
const MAX_VERTICAL_RATIO = 0.7;

type TouchPoint = { x: number; y: number; edge: "left" | "right" | null };

/**
 * Edge-only horizontal swipes between main tabs.
 * Starts near the left edge → swipe right for previous tab.
 * Starts near the right edge → swipe left for next tab.
 * Vertical scrolling and mid-screen gestures are left alone.
 */
export function useEdgeTabSwipe(
  active: AppTab,
  onChange: (tab: AppTab) => void,
) {
  const touch = useRef<TouchPoint | null>(null);
  const activeRef = useRef(active);
  const onChangeRef = useRef(onChange);
  activeRef.current = active;
  onChangeRef.current = onChange;

  function onTouchStart(event: React.TouchEvent) {
    if (event.touches.length !== 1) {
      touch.current = null;
      return;
    }
    const t = event.touches[0];
    const width = window.innerWidth;
    let edge: TouchPoint["edge"] = null;
    if (t.clientX <= EDGE_PX) edge = "left";
    else if (t.clientX >= width - EDGE_PX) edge = "right";
    touch.current = { x: t.clientX, y: t.clientY, edge };
  }

  function onTouchEnd(event: React.TouchEvent) {
    const start = touch.current;
    touch.current = null;
    if (!start?.edge || event.changedTouches.length === 0) return;

    const t = event.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < MIN_SWIPE_PX) return;
    if (Math.abs(dy) > Math.abs(dx) * MAX_VERTICAL_RATIO) return;

    const index = APP_TAB_ORDER.indexOf(activeRef.current);
    if (index < 0) return;

    // Left edge + swipe right → previous tab
    if (start.edge === "left" && dx > 0 && index > 0) {
      onChangeRef.current(APP_TAB_ORDER[index - 1]!);
      return;
    }
    // Right edge + swipe left → next tab
    if (start.edge === "right" && dx < 0 && index < APP_TAB_ORDER.length - 1) {
      onChangeRef.current(APP_TAB_ORDER[index + 1]!);
    }
  }

  function onTouchCancel() {
    touch.current = null;
  }

  return { onTouchStart, onTouchEnd, onTouchCancel };
}
