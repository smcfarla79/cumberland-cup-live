/**
 * Random Saturday AM Front-9 scramble lineups only (no scores).
 * Clears any existing Saturday AM matches, then creates 5 × 2v2.
 * Run: node scripts/seed-saturday-am-lineups.mjs
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const SAT_AM_ID = "00000000-0000-4000-8000-000000000304";

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

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pairUp(players) {
  const shuffled = shuffle(players);
  const pairs = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    pairs.push([shuffled[i], shuffled[i + 1]]);
  }
  return pairs;
}

async function main() {
  const env = loadEnv();
  const sb = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  const { data: teams, error: teamsErr } = await sb
    .from("teams")
    .select("id,name")
    .order("name");
  if (teamsErr) throw new Error(teamsErr.message);
  const [teamA, teamB] = teams ?? [];
  if (!teamA || !teamB) throw new Error("Need two teams");

  const { data: teamPlayers, error: tpErr } = await sb
    .from("team_players")
    .select("team_id, player_id, player:players(id, display_name)");
  if (tpErr) throw new Error(tpErr.message);

  const teamAPlayers = (teamPlayers ?? [])
    .filter((tp) => tp.team_id === teamA.id)
    .map((tp) => tp.player);
  const teamBPlayers = (teamPlayers ?? [])
    .filter((tp) => tp.team_id === teamB.id)
    .map((tp) => tp.player);

  if (teamAPlayers.length !== 10 || teamBPlayers.length !== 10) {
    throw new Error(
      `Expected 10 players per team, got A=${teamAPlayers.length} B=${teamBPlayers.length}`,
    );
  }

  const { data: existing, error: exErr } = await sb
    .from("matches")
    .select("id")
    .eq("round_id", SAT_AM_ID);
  if (exErr) throw new Error(exErr.message);

  if (existing?.length) {
    const ids = existing.map((m) => m.id);
    const { error: delMp } = await sb
      .from("match_players")
      .delete()
      .in("match_id", ids);
    if (delMp) throw new Error(delMp.message);
    const { error: delM } = await sb.from("matches").delete().in("id", ids);
    if (delM) throw new Error(delM.message);
    console.log(`Cleared ${ids.length} existing Saturday AM match(es).`);
  }

  const pairsA = pairUp(teamAPlayers);
  const pairsB = pairUp(teamBPlayers);

  console.log("Saturday AM — random scramble lineups:");

  for (let i = 0; i < 5; i++) {
    const matchNumber = i + 1;
    const [a1, a2] = pairsA[i];
    const [b1, b2] = pairsB[i];

    const { data: created, error } = await sb
      .from("matches")
      .insert({
        round_id: SAT_AM_ID,
        match_number: matchNumber,
        side_size: 2,
        points_value: 1,
        status: "pending",
        is_halved: false,
        winning_team_id: null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const rows = [
      { match_id: created.id, player_id: a1.id, team_id: teamA.id },
      { match_id: created.id, player_id: a2.id, team_id: teamA.id },
      { match_id: created.id, player_id: b1.id, team_id: teamB.id },
      { match_id: created.id, player_id: b2.id, team_id: teamB.id },
    ];
    const { error: mpErr } = await sb.from("match_players").insert(rows);
    if (mpErr) throw new Error(mpErr.message);

    console.log(
      `Match ${matchNumber}: ${a1.display_name} / ${a2.display_name}  vs  ${b1.display_name} / ${b2.display_name}`,
    );
  }

  console.log("Done (lineups only — no scores).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
