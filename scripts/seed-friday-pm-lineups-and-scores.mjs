/**
 * Finalize Friday PM lineups (matches 2–5) + hole scores for all players.
 * Run: node scripts/seed-friday-pm-lineups-and-scores.mjs
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const FRI_PM_ID = "00000000-0000-4000-8000-000000000303";

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

/** Varied outcomes across the five PM matches. */
const MATCH_SCRIPTS = {
  1: ["b", "a", "b", "h", "b", "a", "b", "h", "b"], // B 3 up (already existed)
  2: ["a", "a", "b", "a", "h", "a", "b", "a", "h"], // A 3 up
  3: ["a", "b", "h", "a", "b", "h", "a", "b", "h"], // Halved
  4: ["b", "b", "a", "b", "h", "b", "a", "b", "a"], // B 2 up
  5: ["a", "a", "a", "b", "a", "h", "b", "a", "a"], // A 4 up
};

async function main() {
  const env = loadEnv();
  const sb = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  const { data: teams } = await sb.from("teams").select("id,name").order("name");
  const [teamA, teamB] = teams ?? [];
  if (!teamA || !teamB) throw new Error("Need two teams");

  const { data: players } = await sb.from("players").select("id,display_name");
  const byName = Object.fromEntries(
    (players ?? []).map((p) => [p.display_name, p.id]),
  );
  const pmap = Object.fromEntries(
    (players ?? []).map((p) => [p.id, p.display_name]),
  );

  const { data: existing } = await sb
    .from("matches")
    .select("id,match_number,side_size,points_value,status")
    .eq("round_id", FRI_PM_ID)
    .order("match_number");

  const { data: existingMp } = await sb
    .from("match_players")
    .select("match_id,player_id,team_id")
    .in(
      "match_id",
      (existing ?? []).map((m) => m.id),
    );

  const used = new Set((existingMp ?? []).map((x) => x.player_id));

  // Planned pairings for matches 2–5 (different from Friday AM)
  const planned = [
    {
      match_number: 2,
      a: ["Brett Cooper", "Jackson Cooper"],
      b: ["Scott McFarlane", "Rand Jackson"],
    },
    {
      match_number: 3,
      a: ["Andrew Heitzenrater", "Andy Franks"],
      b: ["James Snover", "Taylor Rowe"],
    },
    {
      match_number: 4,
      a: ["Billy Collins", "Mike Walker"],
      b: ["Tommy Concklin", "Tyler Fullerton"],
    },
    {
      match_number: 5,
      a: ["Harrison Lee", "Larson Heitzenrater"],
      b: ["Ben Clune", "Will Moore"],
    },
  ];

  console.log("Friday PM — creating remaining lineups…");

  for (const plan of planned) {
    const already = (existing ?? []).find(
      (m) => m.match_number === plan.match_number,
    );
    let matchId = already?.id;

    if (!matchId) {
      const { data: created, error } = await sb
        .from("matches")
        .insert({
          round_id: FRI_PM_ID,
          match_number: plan.match_number,
          side_size: 2,
          points_value: 1,
          status: "pending",
          is_halved: false,
          winning_team_id: null,
        })
        .select("id,match_number")
        .single();
      if (error) throw new Error(error.message);
      matchId = created.id;
      console.log(`Created match ${plan.match_number}`);
    } else {
      console.log(`Match ${plan.match_number} already exists`);
    }

    const rows = [];
    for (const name of plan.a) {
      const pid = byName[name];
      if (!pid) throw new Error(`Missing player ${name}`);
      if (used.has(pid)) {
        console.log(`  skip ${name} (already assigned)`);
        continue;
      }
      rows.push({ match_id: matchId, player_id: pid, team_id: teamA.id });
      used.add(pid);
    }
    for (const name of plan.b) {
      const pid = byName[name];
      if (!pid) throw new Error(`Missing player ${name}`);
      if (used.has(pid)) {
        console.log(`  skip ${name} (already assigned)`);
        continue;
      }
      rows.push({ match_id: matchId, player_id: pid, team_id: teamB.id });
      used.add(pid);
    }

    if (rows.length) {
      const { error: mpErr } = await sb.from("match_players").insert(rows);
      if (mpErr) throw new Error(mpErr.message);
      console.log(
        `  Assigned: ${plan.a.join(" / ")} vs ${plan.b.join(" / ")}`,
      );
    }
  }

  // Reload all matches + players for scoring
  const { data: matches } = await sb
    .from("matches")
    .select("id,match_number,side_size,points_value")
    .eq("round_id", FRI_PM_ID)
    .order("match_number");
  const { data: mps } = await sb
    .from("match_players")
    .select("match_id,player_id,team_id")
    .in(
      "match_id",
      (matches ?? []).map((m) => m.id),
    );
  const { data: holes } = await sb
    .from("holes")
    .select("hole_number,par,handicap_index")
    .order("hole_number");
  const backHoles = (holes ?? []).filter(
    (h) => h.hole_number >= 10 && h.hole_number <= 18,
  );
  if (backHoles.length !== 9) {
    throw new Error(`Expected 9 back holes, got ${backHoles.length}`);
  }

  const scoreRows = [];
  for (const match of matches ?? []) {
    const side = (mps ?? []).filter((x) => x.match_id === match.id);
    const sideA = side.filter((p) => p.team_id === teamA.id);
    const sideB = side.filter((p) => p.team_id === teamB.id);
    const script = MATCH_SCRIPTS[match.match_number] ?? Array(9).fill("h");

    console.log(
      `Scoring match ${match.match_number}:`,
      sideA.map((p) => pmap[p.player_id]).join(" / "),
      "vs",
      sideB.map((p) => pmap[p.player_id]).join(" / "),
    );

    if (sideA.length < 2 || sideB.length < 2) {
      throw new Error(`Match ${match.match_number} not fully lined up`);
    }

    backHoles.forEach((hole, hi) => {
      const result = script[hi] ?? "h";
      const aBest = result === "b" ? hole.par + 1 : hole.par;
      const bBest = result === "a" ? hole.par + 1 : hole.par;
      sideA.forEach((mp, pi) => {
        scoreRows.push({
          round_id: FRI_PM_ID,
          player_id: mp.player_id,
          hole_number: hole.hole_number,
          strokes: Math.min(8, aBest + pi),
        });
      });
      sideB.forEach((mp, pi) => {
        scoreRows.push({
          round_id: FRI_PM_ID,
          player_id: mp.player_id,
          hole_number: hole.hole_number,
          strokes: Math.min(8, bBest + pi),
        });
      });
    });
  }

  console.log("Upserting", scoreRows.length, "hole scores…");
  const { error: upErr } = await sb.from("hole_scores").upsert(scoreRows, {
    onConflict: "round_id,player_id,hole_number",
  });
  if (upErr) throw new Error(upErr.message);

  let ptsA = 0;
  let ptsB = 0;
  for (const match of matches ?? []) {
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

    if (finalResult === "halve") {
      ptsA += 0.5;
      ptsB += 0.5;
    } else if (finalResult === "team_a") ptsA += 1;
    else ptsB += 1;

    const label =
      finalResult === "halve"
        ? "HALVED"
        : `${finalResult === "team_a" ? teamA.name : teamB.name} ${Math.abs(lead)} up`;
    console.log(`Match ${match.match_number}: ${label} (${aWon}-${bWon})`);
  }

  console.log(`Session points: ${teamA.name} ${ptsA} – ${ptsB} ${teamB.name}`);
  console.log("Done. Refresh Cup / Play.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
