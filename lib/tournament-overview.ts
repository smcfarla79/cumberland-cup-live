/** Tournament overview from the 2026 CC Source of Truth (phones omitted). */

export const COURSE_ADDRESS = {
  name: "The Course at Sewanee",
  line: "444 Greens View Road, Sewanee, TN 37383",
};

export const HOUSES = [
  {
    name: "The Sommer House",
    line: "460 Greens View Road, Sewanee, TN 37383",
  },
  {
    name: "The West House",
    line: "435 Florida Ave, Sewanee, TN 37383",
  },
] as const;

/** Deep links to open an address in Apple Maps or Google Maps. */
export function mapsLinksForAddress(address: string) {
  const q = encodeURIComponent(address);
  return {
    apple: `https://maps.apple.com/?q=${q}`,
    google: `https://www.google.com/maps/search/?api=1&query=${q}`,
  };
}

export const WEEKEND_DATES = "Thursday, July 30 – Sunday, August 2, 2026";

/**
 * Start of the first tournament day (Thursday) in America/Chicago.
 * July is CDT (UTC−5). Once local time reaches this instant, the homepage
 * countdown is removed entirely.
 */
export const TOURNAMENT_START_MS = Date.parse("2026-07-30T05:00:00.000Z");

export const TEE_TIMES = [
  {
    day: "Thursday, July 30",
    slots: [
      "3:00 PM CST — tee times every 10 minutes through 3:40 · 18 holes",
    ],
  },
  {
    day: "Friday, July 31",
    slots: [
      "9:00 AM — every 10 minutes through 9:40 · 18 holes",
      "2:30 PM — every 10 minutes through 3:10 · 9 holes",
    ],
  },
  {
    day: "Saturday, August 1",
    slots: [
      "9:00 AM — every 10 minutes through 9:40 · 18 holes",
      "2:30 PM — every 10 minutes through 3:10 · 9 holes",
    ],
  },
] as const;

export const COMPETITION = [
  {
    title: "Thursday · Seeding",
    detail: "9 holes individual stroke play. Potential E9s in whatever format you want.",
  },
  {
    title: "Friday · Day 1",
    detail: "AM: 9 holes 2-man best ball (1 pt). PM: 9 holes 2-man shamble (1 pt).",
  },
  {
    title: "Saturday · Day 2",
    detail:
      "AM: 9 holes 2-man scramble (1 pt). Then 18 holes 1v1 match play (2 pts).",
  },
] as const;

export const CUP_RULES = [
  "First team to 18 points wins The Cup.",
  "A 17.5–17.5 tie goes to a playoff: every player plays Hole 4 with handicaps; lower team net total wins.",
  "Handicaps collected one week before play. Decimals: .5+ rounds up, .4 and below rounds down.",
] as const;

export const COURSE_RULES = [
  "Native area: if not easily identifiable/playable, play as a lateral hazard — one stroke, drop on the closest line where it entered, 2 clublengths no closer to the hole. One in, two drop, hitting three.",
  "For pace of play, treat OB as a hazard: drop (with competitors’ approval) 2 clublengths from where it crossed, one penalty stroke, play on.",
  "Unless groups agree otherwise, play one tee up from the tips.",
  "Friendship first. On-the-fly rulings: agree with teammates and opponents, then move on. Don’t cheat.",
] as const;

export const SOCIAL = [
  {
    day: "Thursday",
    detail: "Champions Dinner at The Sewanee Inn · 7:00 PM",
  },
  {
    day: "Friday",
    detail: "Dinner catered to the Sommer House after play",
  },
  {
    day: "Saturday",
    detail: "Be adults. Feed yourselves.",
  },
] as const;

export const HOUSE_NOTES = [
  "Treat the Sommer House with respect so we can keep using it.",
  "There will be a keg at the Sommer House — plan accordingly.",
] as const;

export const ATTENDEES = [
  "Ben Clune",
  "Billy Collins",
  "Tommy Concklin",
  "Brett Cooper",
  "Jackson Cooper",
  "Andy Franks",
  "Tyler Fullerton",
  "Andrew Heitzenrater",
  "Larson Heitzenrater",
  "Rand Jackson",
  "Harrison Lee",
  "Garrett Liebe",
  "Scott McFarlane",
  "Will Moore",
  "Hurst Renner",
  "Taylor Rowe",
  "Shane Shelly",
  "James Snover",
  "Marshall Ussery",
  "Mike Walker",
] as const;
