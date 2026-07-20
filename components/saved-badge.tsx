"use client";

/** Brief checkmark confirmation shown right after a score saves. */
export function SavedBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`saved-badge inline-flex items-center gap-1 rounded-full bg-fairway/12 px-2 py-0.5 text-xs font-semibold text-fairway ${className}`}
    >
      <svg viewBox="0 0 20 20" fill="none" className="h-3 w-3">
        <path
          d="M4 10.5l3.8 3.8L16 6"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Saved
    </span>
  );
}
