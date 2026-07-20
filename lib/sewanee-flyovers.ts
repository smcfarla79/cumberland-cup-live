/** Hole flyovers hosted by The Course at Sewanee (official site). */
export const SEWANEE_COURSE_PAGE =
  "https://thecourseatsewanee.com/the-course/";

export type SewaneeFlyover = {
  frontHole: number;
  backHole: number;
  title: string;
  /** Optional well-known name when published by the club. */
  nickname?: string;
  src: string;
  type: "video/mp4" | "video/webm";
};

/**
 * Safari cannot play WebM. Holes that the club only publishes as WebM are
 * re-encoded to H.264 MP4 under /public/flyovers for cross-browser playback.
 * Holes already published as MP4 keep their remote Sewanee URLs.
 */
export const SEWANEE_FLYOVERS: SewaneeFlyover[] = [
  {
    frontHole: 1,
    backHole: 10,
    title: "Hole #1 & #10",
    src: "https://thecourseatsewanee.com/wp-content/uploads/sites/33/2026/05/Hole-1-and-10.mp4",
    type: "video/mp4",
  },
  {
    frontHole: 2,
    backHole: 11,
    title: "Hole #2 & #11",
    src: "/flyovers/hole-2-and-11.mp4",
    type: "video/mp4",
  },
  {
    frontHole: 3,
    backHole: 12,
    title: "Hole #3 & #12",
    src: "/flyovers/hole-3-and-12.mp4",
    type: "video/mp4",
  },
  {
    frontHole: 4,
    backHole: 13,
    title: "Hole #4 & #13",
    src: "/flyovers/hole-4-and-13.mp4",
    type: "video/mp4",
  },
  {
    frontHole: 5,
    backHole: 14,
    title: "Hole #5 & #14",
    nickname: "The Edge",
    src: "/flyovers/hole-5-and-14.mp4",
    type: "video/mp4",
  },
  {
    frontHole: 6,
    backHole: 15,
    title: "Hole #6 & #15",
    src: "https://thecourseatsewanee.com/wp-content/uploads/sites/33/2026/05/Hole-6-0120-2-2.mp4",
    type: "video/mp4",
  },
  {
    frontHole: 7,
    backHole: 16,
    title: "Hole #7 & #16",
    src: "/flyovers/hole-7-and-16.mp4",
    type: "video/mp4",
  },
  {
    frontHole: 8,
    backHole: 17,
    title: "Hole #8 & #17",
    src: "/flyovers/hole-8-and-17.mp4",
    type: "video/mp4",
  },
  {
    frontHole: 9,
    backHole: 18,
    title: "Hole #9 & #18",
    src: "https://thecourseatsewanee.com/wp-content/uploads/sites/33/2026/05/Hole-9-0097-2-2.mp4",
    type: "video/mp4",
  },
];

export const SEWANEE_ABOUT = {
  renovation:
    "Renovated by Gil Hanse in 2013, with a comprehensive bunker renovation in 2026. The original routing remains; greens, bunkers, and alternate tees were reimagined for the Cumberland Plateau.",
  flyoverNote:
    "Gil Hanse’s hole-by-hole descriptions are in these flyover videos from The Course at Sewanee.",
};
