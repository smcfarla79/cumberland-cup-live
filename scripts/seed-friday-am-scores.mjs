/**
 * One-off demo seed: complete Friday AM hole scores + finalize matches.
 * Run: node scripts/seed-friday-am-scores.mjs
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

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

/**
 * Per-match hole winners for a 9-hole best-ball session.
 * 'a' | 'b' | 'h' — deliberately mixed so the board shows up/down variety.
 */
const MATCH_SCRIPTS = {
  1: ["a", "a", "b", "a", "h", "a", "b", "a", "h"], // A 2 up
  2: ["b", "a", "b", "h", "b", "a", "b", "h", "b"], // B 3 up
  3: ["a", "b", "h", "a", "b", "h", "a", "b", "h"], // Halved
  4: ["a", "a", "a", "b", "a", "h", "a", "b", "a"], // A 4 up
  5: ["b", "b", "a", "b", "h", "b", "a", "b", "h"], // B 3 up
};

async function main() {
  const env = loadEnv();
  const sb = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  const { data: rounds, error: re } = await sb
    .from("rounds")
    .select("id,name,hole_count,nine_label,scoring_format")
    .order("day_number");
  if (re) throw new Error(re.message);

  const fri = (rounds ?? []).find((r) => /friday am/i.test(r.name));
  if (!fri) throw new Error("Friday AM round not found");

  const { data: matches, error: me } = await sb
    .from("matches")
    .select(
      "id,match_number,side_size,points_value,status,winning_team_id,is_halved",
    )
    .eq("round_id", fri.id)
    .order("match_number");
  if (me) throw new Error(me.message);
  if (!matches?.length) {
    throw new Error("No Friday AM matches — set lineups first");
  }

  const matchIds = matches.map((m) => m.id);
  const { data: mps } = await sb
    .from("match_players")
    .select("match_id,player_id,team_id")
    .in("match_id", matchIds);

  // handicap column may not exist on every DB yet
  let players = [];
  {
    const withHcp = await sb
      .from("players")
      .select("id,display_name,handicap");
    if (withHcp.error) {
      const bare = await sb.from("players").select("id,display_name");
      if (bare.error) throw new Error(bare.error.message);
      players = (bare.data ?? []).map((p) => ({ ...p, handicap: null }));
    } else {
      players = withHcp.data ?? [];
    }
  }

  const { data: teams } = await sb.from("teams").select("id,name,color");
  const { data: holes } = await sb
    .from("holes")
    .select("hole_number,par,handicap_index")
    .order("hole_number");

  const frontHoles = (holes ?? []).filter((h) => h.hole_number <= 9);
  if (frontHoles.length !== 9) {
    throw new Error(`Expected 9 front holes, got ${frontHoles.length}`);
  }

  const pmap = Object.fromEntries(players.map((p) => [p.id, p]));
  const sortedTeams = [...(teams ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const [teamA, teamB] = sortedTeams;
  if (!teamA || !teamB) throw new Error("Need two teams");

  console.log("Round:", fri.name);
  console.log("Teams:", teamA.name, "vs", teamB.name);

  const scoreRows = [];

  for (const match of matches) {
    const side = (mps ?? []).filter((x) => x.match_id === match.id);
    const sideA = side.filter((p) => p.team_id === teamA.id);
    const sideB = side.filter((p) => p.team_id === teamB.id);
    const script = MATCH_SCRIPTS[match.match_number] ?? Array(9).fill("h");

    console.log(
      `Match ${match.match_number}:`,
      sideA.map((p) => pmap[p.player_id]?.display_name ?? "?").join(" / "),
      "vs",
      sideB.map((p) => pmap[p.player_id]?.display_name ?? "?").join(" / "),
    );

    if (sideA.length < 2 || sideB.length < 2) {
      throw new Error(`Match ${match.match_number} missing a full foursome`);
    }

    frontHoles.forEach((hole, hi) => {
      const result = script[hi] ?? "h";
      // Best-ball: lower best wins. Set winning side best = par, loser = par+1.
      const aBest = result === "b" ? hole.par + 1 : hole.par;
      const bBest = result === "a" ? hole.par + 1 : hole.par;

      // Partner plays one worse so best ball is clear
      scoreRows.push(
        {
          round_id: fri.id,
          player_id: sideA[0].player_id,
          hole_number: hole.hole_number,
          strokes: aBest,
        },
        {
          round_id: fri.id,
          player_id: sideA[1].player_id,
          hole_number: hole.hole_number,
          strokes: Math.min(8, aBest + 1),
        },
        {
          round_id: fri.id,
          player_id: sideB[0].player_id,
          hole_number: hole.hole_number,
          strokes: bBest,
        },
        {
          round_id: fri.id,
          player_id: sideB[1].player_id,
          hole_number: hole.hole_number,
          strokes: Math.min(8, bBest + 1),
        },
      );
    });
  }

  console.log("Upserting", scoreRows.length, "hole scores…");
  const { error: upErr } = await sb.from("hole_scores").upsert(scoreRows, {
    onConflict: "round_id,player_id,hole_number",
  });
  if (upErr) throw new Error(upErr.message);

  // Finalize from scripts (same as standing math with no handicaps)
  for (const match of matches) {
    const script = MATCH_SCRIPTS[match.match_number] ?? Array(9).fill("h");
    let aWon = 0;
    let bWon = 0;
    for (const r of script) {
      if (r === "a") aWon += 1;
      else if (r === "b") bWon += 1;
    }
    const lead = aWon - bWon;
    const finalResult =
      lead > 0 ? "team_a" : lead < 0 ? "team_b" : "halve";

    const desired = {
      status: "complete",
      is_halved: finalResult === "halve",
      winning_team_id:
        finalResult === "halve"
          ? null
          : finalResult === "team_a"
            ? teamA.id
            : teamB.id,
    };
    const { error: finErr } = await sb
      .from("matches")
      .update(desired)
      .eq("id", match.id);
    if (finErr) throw new Error(finErr.message);

    const label =
      finalResult === "halve"
        ? "HALVED"
        : `${finalResult === "team_a" ? teamA.name : teamB.name} ${Math.abs(lead)} up`;
    console.log(`Match ${match.match_number}: ${label} (${aWon}-${bWon})`);
  }

  const ptsA = matches.reduce((sum, m) => {
    const script = MATCH_SCRIPTS[m.match_number] ?? [];
    const a = script.filter((r) => r === "a").length;
    const b = script.filter((r) => r === "b").length;
    if (a === b) return sum + Number(m.points_value) / 2;
    if (a > b) return sum + Number(m.points_value);
    return sum;
  }, 0);
  const ptsB = matches.reduce((sum, m) => {
    const script = MATCH_SCRIPTS[m.match_number] ?? [];
    const a = script.filter((r) => r === "a").length;
    const b = script.filter((r) => r === "b").length;
    if (a === b) return sum + Number(m.points_value) / 2;
    if (b > a) return sum + Number(m.points_value);
    return sum;
  }, 0);

  console.log(`Session points: ${teamA.name} ${ptsA} – ${ptsB} ${teamB.name}`);
  console.log("Done. Refresh the Cup tab.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
