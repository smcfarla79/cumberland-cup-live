/**
 * Align Sewanee scorecard with BlueGolf (front/back loops were swapped).
 * Run: node scripts/fix-sewanee-scorecard.mjs
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const COURSE_ID = "00000000-0000-4000-8000-000000000001";

/** White yards, purple yards, par, handicap — BlueGolf detailed scorecard */
const HOLES = [
  { hole_number: 1, par: 5, handicap_index: 1, yards: 525, yards_purple: 556 },
  { hole_number: 2, par: 5, handicap_index: 3, yards: 500, yards_purple: 500 },
  { hole_number: 3, par: 3, handicap_index: 13, yards: 140, yards_purple: 177 },
  { hole_number: 4, par: 4, handicap_index: 17, yards: 264, yards_purple: 264 },
  { hole_number: 5, par: 3, handicap_index: 11, yards: 156, yards_purple: 200 },
  { hole_number: 6, par: 4, handicap_index: 5, yards: 427, yards_purple: 427 },
  { hole_number: 7, par: 4, handicap_index: 9, yards: 381, yards_purple: 417 },
  { hole_number: 8, par: 4, handicap_index: 15, yards: 362, yards_purple: 371 },
  { hole_number: 9, par: 4, handicap_index: 7, yards: 459, yards_purple: 478 },
  { hole_number: 10, par: 4, handicap_index: 2, yards: 413, yards_purple: 461 },
  { hole_number: 11, par: 5, handicap_index: 4, yards: 533, yards_purple: 533 },
  { hole_number: 12, par: 3, handicap_index: 14, yards: 163, yards_purple: 187 },
  { hole_number: 13, par: 4, handicap_index: 18, yards: 246, yards_purple: 246 },
  { hole_number: 14, par: 3, handicap_index: 8, yards: 185, yards_purple: 218 },
  { hole_number: 15, par: 4, handicap_index: 6, yards: 344, yards_purple: 437 },
  { hole_number: 16, par: 4, handicap_index: 10, yards: 392, yards_purple: 402 },
  { hole_number: 17, par: 4, handicap_index: 16, yards: 315, yards_purple: 315 },
  { hole_number: 18, par: 5, handicap_index: 12, yards: 504, yards_purple: 513 },
];

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

async function main() {
  const env = loadEnv();
  const sb = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  for (const hole of HOLES) {
    const { error } = await sb
      .from("holes")
      .update({
        par: hole.par,
        handicap_index: hole.handicap_index,
        yards: hole.yards,
        yards_purple: hole.yards_purple,
      })
      .eq("course_id", COURSE_ID)
      .eq("hole_number", hole.hole_number);
    if (error) throw new Error(`Hole ${hole.hole_number}: ${error.message}`);
  }

  const { data, error } = await sb
    .from("holes")
    .select("hole_number, par, handicap_index, yards, yards_purple")
    .eq("course_id", COURSE_ID)
    .order("hole_number");
  if (error) throw new Error(error.message);

  console.log("Updated Sewanee scorecard:");
  console.log(" #  Par  Hcp  White  Purple");
  for (const h of data ?? []) {
    console.log(
      `${String(h.hole_number).padStart(2)}   ${h.par}   ${String(h.handicap_index).padStart(2)}   ${String(h.yards).padStart(4)}   ${String(h.yards_purple).padStart(4)}`,
    );
  }
  const frontPar = (data ?? [])
    .filter((h) => h.hole_number <= 9)
    .reduce((s, h) => s + h.par, 0);
  const backPar = (data ?? [])
    .filter((h) => h.hole_number >= 10)
    .reduce((s, h) => s + h.par, 0);
  console.log(`Front ${frontPar} / Back ${backPar} / Total ${frontPar + backPar}`);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
