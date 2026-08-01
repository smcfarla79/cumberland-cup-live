/**
 * Finalize Friday PM matches from hole scores so Cup points update.
 * Run: node scripts/finalize-friday-pm-matches.mjs
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const TOURNAMENT_ID = "00000000-0000-4000-8000-000000000010";
const FRIDAY_PM_ID = "00000000-0000-4000-8000-000000000303";

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

/** Mirror lib/scoring + lib/match-play for Node (no TS imports). */
const LEGACY_STROKE_INDEX = {
  1: 1, 2: 3, 3: 13, 4: 17, 5: 11, 6: 5, 7: 9, 8: 15, 9: 7,
  10: 2, 11: 4, 12: 14, 13: 18, 14: 8, 15: 6, 16: 10, 17: 16, 18: 12,
};

function strokesReceived(courseHcp, strokeIndex) {
  if (courseHcp == null || courseHcp <= 0 || strokeIndex == null || strokeIndex < 1) {
    return 0;
  }
  let strokes = 0;
  if (strokeIndex <= courseHcp) strokes += 1;
  if (courseHcp > 18 && strokeIndex <= courseHcp - 18) strokes += 1;
  if (courseHcp > 36 && strokeIndex <= courseHcp - 36) strokes += 1;
  return strokes;
}

function netScore(gross, courseHcp, strokeIndex) {
  return gross - strokesReceived(courseHcp, strokeIndex);
}

function teamHoleNet(side, holeNumber, sideSize, playersById, scoresByPlayer) {
  const nets = [];
  for (const mp of side) {
    const gross = scoresByPlayer[mp.player_id]?.[holeNumber];
    if (gross == null) return null;
    const hcp = playersById[mp.player_id]?.handicap ?? null;
    const strokeIndex = LEGACY_STROKE_INDEX[holeNumber] ?? null;
    nets.push(netScore(gross, hcp, strokeIndex));
  }
  if (nets.length < sideSize) return null;
  return Math.min(...nets);
}

function standingForMatch({ sideA, sideB, sideSize, holes, playersById, scoresByPlayer }) {
  let aWon = 0;
  let bWon = 0;
  let played = 0;
  for (const hole of holes) {
    const a = teamHoleNet(sideA, hole.hole_number, sideSize, playersById, scoresByPlayer);
    const b = teamHoleNet(sideB, hole.hole_number, sideSize, playersById, scoresByPlayer);
    if (a == null || b == null) continue;
    played += 1;
    if (a < b) aWon += 1;
    else if (b < a) bWon += 1;
  }
  const remaining = holes.length - played;
  const lead = aWon - bWon;
  if (played === holes.length || Math.abs(lead) > remaining) {
    if (lead > 0) return "team_a";
    if (lead < 0) return "team_b";
    return "halve";
  }
  return null;
}

async function main() {
  const env = loadEnv();
  const sb = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  const { data: round, error: roundErr } = await sb
    .from("rounds")
    .select("id, name, nine_label, hole_count, play_format")
    .eq("id", FRIDAY_PM_ID)
    .maybeSingle();
  if (roundErr) throw new Error(roundErr.message);
  if (!round) throw new Error("Friday PM round not found");
  console.log(`Round: ${round.name} (${round.play_format}, ${round.nine_label})`);

  const { data: teams } = await sb
    .from("teams")
    .select("id, name")
    .eq("tournament_id", TOURNAMENT_ID)
    .order("name");
  const sorted = [...(teams ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  const [teamA, teamB] = sorted;
  if (!teamA || !teamB) throw new Error("Need two teams");
  console.log(`Teams: ${teamA.name} vs ${teamB.name}`);

  const { data: matches, error: matchErr } = await sb
    .from("matches")
    .select("id, match_number, side_size, points_value, status, winning_team_id, is_halved")
    .eq("round_id", FRIDAY_PM_ID)
    .order("match_number");
  if (matchErr) throw new Error(matchErr.message);
  console.log(`Matches found: ${(matches ?? []).length}`);

  const { data: holes } = await sb
    .from("holes")
    .select("hole_number, par, handicap_index")
    .eq("course_id", "00000000-0000-4000-8000-000000000001")
    .order("hole_number");
  const roundHoles = (holes ?? []).filter((h) =>
    round.nine_label === "back"
      ? h.hole_number >= 10 && h.hole_number <= 18
      : h.hole_number >= 1 && h.hole_number <= 9,
  );

  const { data: tps } = await sb
    .from("tournament_players")
    .select("player_id, handicap")
    .eq("tournament_id", TOURNAMENT_ID);
  const playersById = Object.fromEntries(
    (tps ?? []).map((p) => [p.player_id, { handicap: p.handicap }]),
  );

  let billyPts = 0;
  let otherPts = 0;

  for (const match of matches ?? []) {
    const { data: mps } = await sb
      .from("match_players")
      .select("match_id, player_id, team_id")
      .eq("match_id", match.id);
    const sideA = (mps ?? []).filter((p) => p.team_id === teamA.id);
    const sideB = (mps ?? []).filter((p) => p.team_id === teamB.id);
    const playerIds = (mps ?? []).map((p) => p.player_id);

    const { data: scores } = await sb
      .from("hole_scores")
      .select("player_id, hole_number, strokes")
      .eq("round_id", FRIDAY_PM_ID)
      .in("player_id", playerIds.length ? playerIds : ["00000000-0000-4000-8000-000000000000"]);

    const scoresByPlayer = {};
    for (const id of playerIds) scoresByPlayer[id] = {};
    for (const row of scores ?? []) {
      if (!scoresByPlayer[row.player_id]) scoresByPlayer[row.player_id] = {};
      scoresByPlayer[row.player_id][row.hole_number] = row.strokes;
    }

    const finalResult = standingForMatch({
      sideA,
      sideB,
      sideSize: match.side_size,
      holes: roundHoles,
      playersById,
      scoresByPlayer,
    });

    if (!finalResult) {
      console.log(
        `Match ${match.match_number}: incomplete (status=${match.status}) — skip`,
      );
      continue;
    }

    const desired = {
      status: "complete",
      is_halved: finalResult === "halve",
      winning_team_id:
        finalResult === "team_a"
          ? teamA.id
          : finalResult === "team_b"
            ? teamB.id
            : null,
    };

    const { error } = await sb.from("matches").update(desired).eq("id", match.id);
    if (error) throw new Error(error.message);

    const winnerName =
      finalResult === "halve"
        ? "HALVE"
        : finalResult === "team_a"
          ? teamA.name
          : teamB.name;
    const pts = Number(match.points_value);
    if (finalResult === "halve") {
      billyPts += pts / 2;
      otherPts += pts / 2;
    } else if (winnerName.toLowerCase().includes("billy")) {
      billyPts += pts;
    } else {
      otherPts += pts;
    }

    console.log(
      `Match ${match.match_number}: ${match.status} → complete · winner=${winnerName} (${pts} pt)`,
    );
  }

  console.log(`\nFriday PM points: ${teamA.name}=${teamA.name.toLowerCase().includes("billy") ? billyPts : otherPts}, ${teamB.name}=${teamB.name.toLowerCase().includes("billy") ? billyPts : otherPts}`);
  console.log(`Team Billy Friday PM total (from this script): ${billyPts}`);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
