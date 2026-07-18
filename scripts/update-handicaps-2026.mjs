/**
 * Update tournament_players course handicaps from the 6.3.26 sheet.
 * Decimals rounded per Cup rules: .5+ up, .4 and below down.
 * Harrison Lee "18*" → 18.
 * Run: node scripts/update-handicaps-2026.mjs
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const TOURNAMENT_ID = "00000000-0000-4000-8000-000000000010";

function loadEnv() {
  const envPath = path.join(root, ".env.local");
  const env = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

function roundHcp(value) {
  const floor = Math.floor(value);
  const frac = value - floor;
  return frac >= 0.5 ? floor + 1 : floor;
}

/** From Handicap 6.3.26 sheet (display name → raw index). */
const RAW = {
  "Brett Cooper": 0.0,
  "Andrew Heitzenrater": 0.6,
  "Scott McFarlane": 0.9,
  "Jackson Cooper": 1.5,
  "Will Moore": 6.0,
  "Hurst Renner": 6.6,
  "James Snover": 7.5,
  "Ben Clune": 8.3,
  "Tommy Concklin": 8.4,
  "Marshall Ussery": 9.4,
  "Tyler Fullerton": 9.6,
  "Mike Walker": 10.2,
  "Billy Collins": 11.0,
  "Garrett Liebe": 13.0,
  "Shane Shelly": 13.3,
  "Taylor Rowe": 15.1,
  "Larson Heitzenrater": 15.5,
  "Rand Jackson": 16.5,
  "Andy Franks": 26.2,
  "Harrison Lee": 18, // 18* on sheet
};

async function main() {
  const env = loadEnv();
  const sb = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  const { data: players, error } = await sb
    .from("players")
    .select("id,display_name");
  if (error) throw new Error(error.message);

  const byName = Object.fromEntries(
    (players ?? []).map((p) => [p.display_name, p.id]),
  );

  for (const [name, raw] of Object.entries(RAW)) {
    const playerId = byName[name];
    if (!playerId) {
      console.warn("Missing player:", name);
      continue;
    }
    const handicap = roundHcp(raw);
    const { error: upErr } = await sb
      .from("tournament_players")
      .update({ handicap })
      .eq("tournament_id", TOURNAMENT_ID)
      .eq("player_id", playerId);
    if (upErr) throw new Error(`${name}: ${upErr.message}`);
    console.log(`${name}: ${raw} → course HCP ${handicap}`);
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
