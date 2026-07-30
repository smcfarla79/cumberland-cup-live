/**
 * Add Larson Heitzenrater back on IR (injured reserve).
 * Keeps Chris McNulty as the active …109 roster slot.
 * Run: node scripts/add-larson-ir.mjs
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const TOURNAMENT_ID = "00000000-0000-4000-8000-000000000010";
const LARSON_ID = "00000000-0000-4000-8000-000000000121";
const LARSON_NAME = "Larson Heitzenrater";

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

  const { data: byName, error: findErr } = await sb
    .from("players")
    .select("id, display_name")
    .eq("display_name", LARSON_NAME)
    .maybeSingle();
  if (findErr) throw new Error(findErr.message);

  let playerId = byName?.id ?? LARSON_ID;

  if (!byName) {
    const { error } = await sb.from("players").upsert({
      id: LARSON_ID,
      display_name: LARSON_NAME,
    });
    if (error) throw new Error(error.message);
    playerId = LARSON_ID;
    console.log(`Inserted ${LARSON_NAME} (${playerId})`);
  } else {
    console.log(`Found existing ${LARSON_NAME} (${playerId})`);
  }

  const { error: linkErr } = await sb.from("tournament_players").upsert({
    tournament_id: TOURNAMENT_ID,
    player_id: playerId,
    handicap: null,
  });
  if (linkErr) throw new Error(linkErr.message);
  console.log("Linked to 2026 tournament (IR in app via IR_PLAYER_IDS).");

  // Ensure he is not on a competitive team / match
  await sb.from("team_players").delete().eq("player_id", playerId);
  await sb.from("match_players").delete().eq("player_id", playerId);

  const { data: roster } = await sb
    .from("tournament_players")
    .select("player:players(display_name)")
    .eq("tournament_id", TOURNAMENT_ID);

  const names = (roster ?? [])
    .map((r) => r.player?.display_name)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  console.log(`Tournament roster (${names.length}):`);
  for (const name of names) {
    const mark = name === LARSON_NAME ? " [IR]" : "";
    console.log(`  - ${name}${mark}`);
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
