"use client";

import { useMemo, useState } from "react";
import {
  SEWANEE_ABOUT,
  SEWANEE_COURSE_PAGE,
  SEWANEE_FLYOVERS,
} from "@/lib/sewanee-flyovers";
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

function holeStatsLine(hole: Hole | undefined) {
  if (!hole) return null;
  const yards = hole.yards ?? hole.yards_purple;
  return `Par ${hole.par}${yards != null ? ` · ${yards} yds` : ""}${
    hole.handicap_index != null ? ` · HCP ${hole.handicap_index}` : ""
  }`;
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

  const [openFlyover, setOpenFlyover] = useState<number | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(false);

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
    <section className="mx-auto w-full max-w-6xl px-4 py-6 pb-16">
      <div className="animate-rise">
        <p className="text-xs tracking-[0.18em] text-fairway uppercase">
          Course scorecard
        </p>
        <h1 className="font-display mt-2 text-3xl text-ink">{courseName}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Holes 10–18 are the same physical holes as 1–9 from different tees.
          Yardages are labeled by tee color.
        </p>
        <p className="mt-3 max-w-2xl text-sm text-muted">{SEWANEE_ABOUT.renovation}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm animate-fade">
        <span className="inline-flex items-center gap-2 rounded-full border border-mist bg-white px-3 py-1.5 font-medium text-ink">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: "#582C83" }}
            aria-hidden
          />
          Purple tees
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-mist bg-white px-3 py-1.5 font-medium text-ink">
          <span
            className="h-2.5 w-2.5 rounded-full border border-ink/30 bg-white"
            aria-hidden
          />
          White tees
        </span>
      </div>

      <div
        className="scroll-fade-x mt-6 overflow-x-auto rounded-2xl border border-mist bg-white shadow-[0_6px_20px_rgba(20,32,27,0.07)] animate-fade"
        data-swipe-ignore
      >
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

      <div className="mt-10 animate-rise">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.18em] text-fairway uppercase">
              Hole guides
            </p>
            <h2 className="font-display mt-2 text-2xl text-ink">
              Descriptions & flyovers
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              {SEWANEE_ABOUT.flyoverNote} Tap a hole to play the video — front
              and back tees share the same physical hole.
            </p>
          </div>
          <a
            href={SEWANEE_COURSE_PAGE}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-sm text-pine underline-offset-2 hover:underline"
          >
            View on Sewanee site →
          </a>
        </div>

        <ul className="mt-5 space-y-2">
          {SEWANEE_FLYOVERS.map((flyover) => {
            const isOpen = openFlyover === flyover.frontHole;
            const frontHole = byNumber.get(flyover.frontHole);
            const backHole = byNumber.get(flyover.backHole);
            return (
              <li
                key={flyover.frontHole}
                className="overflow-hidden rounded-2xl border border-mist bg-white shadow-[0_4px_14px_rgba(20,32,27,0.06)]"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => {
                    const next = isOpen ? null : flyover.frontHole;
                    setOpenFlyover(next);
                    if (next != null) {
                      setVideoLoading(true);
                      setVideoError(false);
                    }
                  }}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left hover:bg-fog/60"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {flyover.title}
                      {flyover.nickname ? (
                        <span className="font-normal text-muted">
                          {" "}
                          · {flyover.nickname}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      Front: {holeStatsLine(frontHole) ?? "—"}
                      {" · "}
                      Back: {holeStatsLine(backHole) ?? "—"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-fairway/30 px-3 py-1 text-xs font-semibold tracking-wide text-fairway uppercase">
                    {isOpen ? "Close" : "Play"}
                  </span>
                </button>

                {isOpen ? (
                  <div className="border-t border-mist bg-fog/40 px-3 pb-3 pt-3 sm:px-4">
                    <div className="relative overflow-hidden rounded-xl border border-mist bg-black">
                      {videoLoading ? (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/80 text-fog">
                          <span
                            className="h-6 w-6 animate-spin rounded-full border-2 border-fog/30 border-t-fog"
                            aria-hidden
                          />
                          <span className="text-xs font-medium">Loading video…</span>
                        </div>
                      ) : null}
                      {videoError ? (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-black/85 px-4 text-center text-fog">
                          <span className="text-sm font-medium">
                            Video couldn’t load.
                          </span>
                          <a
                            href={SEWANEE_COURSE_PAGE}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-mist underline-offset-2 hover:underline"
                          >
                            View on Sewanee site →
                          </a>
                        </div>
                      ) : null}
                      <video
                        key={flyover.src}
                        controls
                        playsInline
                        preload="metadata"
                        onLoadedData={() => setVideoLoading(false)}
                        onCanPlay={() => setVideoLoading(false)}
                        onError={() => {
                          setVideoLoading(false);
                          setVideoError(true);
                        }}
                        className="aspect-video w-full bg-black"
                      >
                        <source src={flyover.src} type={flyover.type} />
                        Your browser does not support this video.
                      </video>
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      Video courtesy of{" "}
                      <a
                        href={SEWANEE_COURSE_PAGE}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pine underline-offset-2 hover:underline"
                      >
                        The Course at Sewanee
                      </a>
                      . Descriptions are narrated in the flyover.
                    </p>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
