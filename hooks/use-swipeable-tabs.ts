"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { APP_TAB_ORDER } from "@/lib/app-tabs";
import type { AppTab } from "@/lib/types";

/** Movement (px) before we commit to a horizontal-vs-vertical gesture. */
const DIRECTION_LOCK_PX = 8;
/** Horizontal travel must beat vertical by this factor to lock as a swipe. */
const DIRECTION_BIAS = 1.3;
/** Damping applied when dragging past the first/last tab. */
const RUBBER_BAND = 0.35;
/** Slide animation duration (ms). */
const COMMIT_MS = 240;

type LockedDir = "horizontal" | "vertical" | null;
type Gesture = { startX: number; startY: number; lockedDir: LockedDir };

/**
 * Whole-page edge-to-edge swipe between main tabs. Works from anywhere on
 * the screen (not just edges), tracks the finger 1:1, and defers to native
 * vertical scrolling — and to any element marked `data-swipe-ignore`
 * (horizontally scrollable strips/tables) — as soon as the gesture reveals
 * itself as non-horizontal.
 */
export function useSwipeableTabs(active: AppTab, onChange: (tab: AppTab) => void) {
  // A plain ref's assignment doesn't trigger effects, and the swipeable
  // container isn't mounted until the app gate opens — so we track the node
  // in state via a callback ref, letting the listener effect below re-run
  // once the element actually exists.
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const containerRef = useCallback((el: HTMLDivElement | null) => {
    setNode(el);
  }, []);
  const [offset, setOffset] = useState(0);
  const [transitionOn, setTransitionOn] = useState(false);

  const activeRef = useRef(active);
  const onChangeRef = useRef(onChange);
  const offsetRef = useRef(0);
  const widthRef = useRef(0);
  activeRef.current = active;
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!node) return;
    const measure = () => {
      widthRef.current = node.clientWidth || window.innerWidth;
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [node]);

  useEffect(() => {
    const el = node;
    if (!el) return;

    let gesture: Gesture | null = null;

    function setOffsetNow(v: number) {
      offsetRef.current = v;
      setOffset(v);
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) {
        gesture = null;
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-swipe-ignore]")) {
        gesture = null;
        return;
      }
      const t = e.touches[0]!;
      gesture = { startX: t.clientX, startY: t.clientY, lockedDir: null };
    }

    function onTouchMove(e: TouchEvent) {
      if (!gesture || e.touches.length !== 1) return;
      const t = e.touches[0]!;
      const dx = t.clientX - gesture.startX;
      const dy = t.clientY - gesture.startY;

      if (gesture.lockedDir === null) {
        if (Math.abs(dx) < DIRECTION_LOCK_PX && Math.abs(dy) < DIRECTION_LOCK_PX) {
          return;
        }
        gesture.lockedDir =
          Math.abs(dx) > Math.abs(dy) * DIRECTION_BIAS ? "horizontal" : "vertical";
        if (gesture.lockedDir === "vertical") return;
        setTransitionOn(false);
      }

      if (gesture.lockedDir !== "horizontal") return;

      // Only take over once we're sure — keeps vertical scroll untouched.
      e.preventDefault();

      const index = APP_TAB_ORDER.indexOf(activeRef.current);
      const atStart = index <= 0;
      const atEnd = index >= APP_TAB_ORDER.length - 1;
      let next = dx;
      if ((dx > 0 && atStart) || (dx < 0 && atEnd)) {
        next = dx * RUBBER_BAND;
      }
      setOffsetNow(next);
    }

    function commit(exitOffset: number, nextTab: AppTab) {
      setOffsetNow(exitOffset);
      window.setTimeout(() => {
        onChangeRef.current(nextTab);
        setTransitionOn(false);
        setOffsetNow(-exitOffset);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTransitionOn(true);
            setOffsetNow(0);
          });
        });
      }, COMMIT_MS);
    }

    function finishGesture() {
      const active = gesture;
      gesture = null;
      if (!active || active.lockedDir !== "horizontal") return;

      const w = widthRef.current || window.innerWidth;
      const threshold = Math.min(120, w * 0.22);
      const index = APP_TAB_ORDER.indexOf(activeRef.current);
      const dx = offsetRef.current;

      setTransitionOn(true);

      if (dx >= threshold && index > 0) {
        commit(w, APP_TAB_ORDER[index - 1]!);
      } else if (dx <= -threshold && index < APP_TAB_ORDER.length - 1) {
        commit(-w, APP_TAB_ORDER[index + 1]!);
      } else {
        setOffsetNow(0);
      }
    }

    function onTouchCancel() {
      gesture = null;
      setTransitionOn(true);
      setOffsetNow(0);
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", finishGesture, { passive: true });
    el.addEventListener("touchcancel", onTouchCancel, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", finishGesture);
      el.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [node]);

  return {
    containerRef,
    contentStyle: {
      transform: `translateX(${offset}px)`,
      transition: transitionOn
        ? `transform ${COMMIT_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)`
        : "none",
    },
  };
}
