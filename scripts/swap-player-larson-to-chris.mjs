/**
 * Replace Larson Heitzenrater with Chris McNulty in the live roster.
 * Reuses the same player id so tournament_players stays linked.
 * Clears team/match/score rows for that slot so Chris starts unassigned.
 * Run: node scripts/swap-player-larson-to-chris.mjs
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const TOURNAMENT_ID = "00000000-0000-4000-8000-000000000010";
const PLAYER_ID = "00000000-0000-4000-8000-000000000109";
const FROM_NAME = "Larson Heitzenrater";
const TO_NAME = "Chris McNulty";

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

  const { data: existing, error: findErr } = await sb
    .from("players")
    .select("id, display_name")
    .eq("display_name", FROM_NAME)
    .maybeSingle();
  if (findErr) throw new Error(findErr.message);

  const { data: alreadyChris } = await sb
    .from("players")
    .select("id, display_name")
    .eq("display_name", TO_NAME)
    .maybeSingle();

  if (alreadyChris) {
    console.log(`${TO_NAME} already exists (${alreadyChris.id}).`);
    if (existing) {
      console.log(`Also found ${FROM_NAME}; cleaning that row up separately.`);
    }
  }

  let playerId = alreadyChris?.id ?? existing?.id ?? PLAYER_ID;

  if (existing && !alreadyChris) {
    const { error } = await sb
      .from("players")
      .update({ display_name: TO_NAME })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    playerId = existing.id;
    console.log(`Renamed ${FROM_NAME} → ${TO_NAME} (${playerId})`);
  } else if (!alreadyChris && !existing) {
    const { error } = await sb.from("players").upsert({
      id: PLAYER_ID,
      display_name: TO_NAME,
    });
    if (error) throw new Error(error.message);
    playerId = PLAYER_ID;
    console.log(`Inserted ${TO_NAME} (${playerId})`);
  }

  const { error: linkErr } = await sb.from("tournament_players").upsert({
    tournament_id: TOURNAMENT_ID,
    player_id: playerId,
  });
  if (linkErr) throw new Error(linkErr.message);

  // Clear handicap until we have Chris's index
  await sb
    .from("tournament_players")
    .update({ handicap: null })
    .eq("tournament_id", TOURNAMENT_ID)
    .eq("player_id", playerId);

  await sb.from("team_players").delete().eq("player_id", playerId);
  await sb.from("match_players").delete().eq("player_id", playerId);
  await sb.from("hole_scores").delete().eq("player_id", playerId);

  if (existing && alreadyChris && existing.id !== alreadyChris.id) {
    await sb.from("tournament_players").delete().eq("player_id", existing.id);
    await sb.from("team_players").delete().eq("player_id", existing.id);
    await sb.from("match_players").delete().eq("player_id", existing.id);
    await sb.from("hole_scores").delete().eq("player_id", existing.id);
    await sb.from("players").delete().eq("id", existing.id);
    console.log(`Removed leftover ${FROM_NAME} row (${existing.id})`);
  }

  const { data: roster } = await sb
    .from("tournament_players")
    .select("player:players(display_name)")
    .eq("tournament_id", TOURNAMENT_ID);

  const names = (roster ?? [])
    .map((r) => r.player?.display_name)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  console.log(`Tournament roster (${names.length}):`);
  for (const name of names) console.log(`  - ${name}`);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
