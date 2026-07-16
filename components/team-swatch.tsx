"use client";

/** Sewanee purple (#582C83) / white need a ring so the swatch stays visible. */
export function TeamSwatch({
  color,
  className = "h-2.5 w-2.5",
}: {
  color: string | null | undefined;
  className?: string;
}) {
  const value = color ?? "#582C83";
  const isLight =
    value.toLowerCase() === "#ffffff" ||
    value.toLowerCase() === "#fff" ||
    value.toLowerCase() === "white";

  return (
    <span
      className={`inline-block shrink-0 rounded-full ${className}`}
      style={{
        backgroundColor: value,
        boxShadow: isLight
          ? "inset 0 0 0 1px rgba(20, 32, 27, 0.35)"
          : undefined,
        outline: isLight ? "1px solid rgba(20, 32, 27, 0.2)" : undefined,
      }}
      aria-hidden
    />
  );
}
