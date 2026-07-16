"use client";

import { useMemo } from "react";
import type { Hole } from "@/lib/types";

type CourseTabProps = {
  courseName: string;
  holes: Hole[];
};

type YardKey = "yards" | "yards_purple";

function cellValue(
  hole: Hole | undefined,
  key: "par" | "handicap_index" | YardKey,
) {
  if (!hole) return "—";
  if (key === "par") return hole.par;
  if (key === "handicap_index") return hole.handicap_index ?? "—";
  if (key === "yards_purple") return hole.yards_purple ?? "—";
  return hole.yards ?? "—";
}

function sumYards(holes: Hole[], key: YardKey) {
  return holes.reduce((total, hole) => {
    const value = key === "yards_purple" ? hole.yards_purple : hole.yards;
    return total + (value ?? 0);
  }, 0);
}

function sumPar(holes: Hole[]) {
  return holes.reduce((total, hole) => total + hole.par, 0);
}

export function CourseTab({ courseName, holes }: CourseTabProps) {
  const ordered = useMemo(
    () => [...holes].sort((a, b) => a.hole_number - b.hole_number),
    [holes],
  );

  const front = ordered.filter((h) => h.hole_number <= 9);
  const back = ordered.filter((h) => h.hole_number >= 10);
  const byNumber = useMemo(() => {
    const map = new Map<number, Hole>();
    for (const hole of ordered) map.set(hole.hole_number, hole);
    return map;
  }, [ordered]);

  const frontPar = sumPar(front);
  const backPar = sumPar(back);
  const frontWhite = sumYards(front, "yards");
  const backWhite = sumYards(back, "yards");
  const frontPurple = sumYards(front, "yards_purple");
  const backPurple = sumYards(back, "yards_purple");

  const holeHeaders = [
    ...Array.from({ length: 9 }, (_, i) => i + 1),
    "Out",
    ...Array.from({ length: 9 }, (_, i) => i + 10),
    "In",
    "Tot",
  ] as const;

  function rowCells(
    key: "par" | "handicap_index" | YardKey,
    outTotal: number | string,
    inTotal: number | string,
    grandTotal: number | string,
  ) {
    return (
      <>
        {Array.from({ length: 9 }, (_, i) => {
          const hole = byNumber.get(i + 1);
          return (
            <td
              key={`f-${key}-${i + 1}`}
              className="px-1.5 py-2 text-center tabular-nums"
            >
              {cellValue(hole, key)}
            </td>
          );
        })}
        <td className="bg-fog/80 px-1.5 py-2 text-center font-semibold tabular-nums">
          {outTotal}
        </td>
        {Array.from({ length: 9 }, (_, i) => {
          const hole = byNumber.get(i + 10);
          return (
            <td
              key={`b-${key}-${i + 10}`}
              className="px-1.5 py-2 text-center tabular-nums"
            >
              {cellValue(hole, key)}
            </td>
          );
        })}
        <td className="bg-fog/80 px-1.5 py-2 text-center font-semibold tabular-nums">
          {inTotal}
        </td>
        <td className="bg-fog px-1.5 py-2 text-center font-semibold tabular-nums">
          {grandTotal}
        </td>
      </>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="animate-rise">
        <p className="text-xs tracking-[0.18em] text-fairway uppercase">
          Course scorecard
        </p>
        <h1 className="font-display mt-2 text-3xl text-ink">{courseName}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Holes 10–18 are the same physical holes as 1–9 from different tees.
          Yardages are labeled by tee color.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs animate-fade">
        <span className="inline-flex items-center gap-2 border border-mist bg-white px-2.5 py-1.5 text-ink">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: "#582C83" }}
            aria-hidden
          />
          Purple tees
        </span>
        <span className="inline-flex items-center gap-2 border border-mist bg-white px-2.5 py-1.5 text-ink">
          <span
            className="h-2.5 w-2.5 rounded-full border border-ink/30 bg-white"
            aria-hidden
          />
          White tees
        </span>
      </div>

      <div className="mt-6 overflow-x-auto border border-mist bg-white animate-fade">
        <table className="w-full min-w-[760px] border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-mist bg-pine text-fog">
              <th className="sticky left-0 z-10 bg-pine px-3 py-2.5 text-left font-semibold">
                Hole
              </th>
              {holeHeaders.map((label) => (
                <th
                  key={`h-${label}`}
                  className={[
                    "px-1.5 py-2.5 text-center font-semibold tabular-nums",
                    label === "Out" || label === "In" || label === "Tot"
                      ? "bg-pine-deep/40"
                      : "",
                  ].join(" ")}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-ink">
            <tr className="border-b border-mist">
              <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-medium">
                Par
              </th>
              {rowCells("par", frontPar, backPar, frontPar + backPar)}
            </tr>
            <tr className="border-b border-mist">
              <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-medium">
                Handicap
              </th>
              {rowCells("handicap_index", "—", "—", "—")}
            </tr>
            <tr className="border-b border-mist bg-[#582C83]/[0.04]">
              <th className="sticky left-0 z-10 bg-[#f7f4fa] px-3 py-2 text-left font-medium">
                <span className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: "#582C83" }}
                    aria-hidden
                  />
                  Yards · Purple
                </span>
              </th>
              {rowCells(
                "yards_purple",
                frontPurple,
                backPurple,
                frontPurple + backPurple,
              )}
            </tr>
            <tr>
              <th className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-medium">
                <span className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full border border-ink/30 bg-white"
                    aria-hidden
                  />
                  Yards · White
                </span>
              </th>
              {rowCells(
                "yards",
                frontWhite,
                backWhite,
                frontWhite + backWhite,
              )}
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted">
        Scroll sideways on phones to see the full card. Your Source of Truth
        notes play is typically one tee up from the tips (White).
      </p>
    </section>
  );
}
