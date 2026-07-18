"use client";

import { useEffect, useState, useEffectEvent } from "react";
import { AppTabs } from "@/components/app-tabs";
import { CourseTab } from "@/components/course-tab";
import { CupTab } from "@/components/cup-tab";
import { HomeTab } from "@/components/home-tab";
import { PinGate } from "@/components/pin-gate";
import { PlayTab } from "@/components/play-tab";
import { PlayerPicker } from "@/components/player-picker";
import { TeamsTab } from "@/components/teams-tab";
import { clearSession, getSession, setSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/client";
import type {
  AppTab,
  Hole,
  Player,
  Round,
  Team,
  Tournament,
} from "@/lib/types";

type Gate = "loading" | "pin" | "player" | "app" | "error";

export function CupApp() {
  const [gate, setGate] = useState<Gate>("loading");
  const [tab, setTab] = useState<AppTab>("home");
  const [playRoundId, setPlayRoundId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [holes, setHoles] = useState<Hole[]>([]);
  const [courseName, setCourseName] = useState("The Course at Sewanee");
  const [session, setSessionState] = useState(getSession());
  const [pinUnlocked, setPinUnlocked] = useState(false);

  const bootstrap = useEffectEvent(async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (
      !supabaseUrl ||
      supabaseUrl.includes("your-project") ||
      supabaseUrl.includes("PASTE_") ||
      !supabaseUrl.includes(".supabase.co")
    ) {
      setError(
        "Your .env.local Supabase URL looks missing or incomplete. Copy the Project URL from Supabase → Project Settings → API.",
      );
      setGate("error");
      return;
    }

    const supabase = createClient();

    const tournamentQuery = supabase
      .from("tournaments")
      .select("id, name, year, weekend_pin, course_id")
      .eq("is_active", true)
      .order("year", { ascending: false })
      .limit(1)
      .maybeSingle();

    const timeout = new Promise<never>((_, reject) => {
      window.setTimeout(
        () =>
          reject(
            new Error(
              "Timed out reaching Supabase. Double-check your Supabase URL and anon key, then restart or redeploy.",
            ),
          ),
        10000,
      );
    });

    let tournamentRow;
    let tournamentError;
    try {
      const result = await Promise.race([tournamentQuery, timeout]);
      tournamentRow = result.data;
      tournamentError = result.error;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reach Supabase.");
      setGate("error");
      return;
    }

    if (tournamentError || !tournamentRow) {
      setError(
        tournamentError?.message ??
          "No active tournament found. Check your Supabase seed data.",
      );
      setGate("error");
      return;
    }

    const activeTournament = tournamentRow as Tournament;
    setTournament(activeTournament);

    const [
      playersResponse,
      { data: roundRows },
      holesResponse,
      { data: teamRows },
      { data: courseRow },
    ] = await Promise.all([
      supabase
        .from("tournament_players")
        .select("handicap, is_admin, player:players(id, display_name)")
        .eq("tournament_id", activeTournament.id),
      supabase
        .from("rounds")
        .select(
          "id, tournament_id, name, day_number, play_date, scoring_format, hole_count, nine_label, play_format",
        )
        .eq("tournament_id", activeTournament.id)
        .order("day_number")
        .order("play_date"),
      supabase
        .from("holes")
        .select("id, hole_number, par, handicap_index, yards, yards_purple")
        .eq("course_id", activeTournament.course_id)
        .order("hole_number"),
      supabase
        .from("teams")
        .select("id, tournament_id, name, color")
        .eq("tournament_id", activeTournament.id)
        .order("name"),
      supabase
        .from("courses")
        .select("name")
        .eq("id", activeTournament.course_id)
        .maybeSingle(),
    ]);

    let playerRows = playersResponse.data;
    if (playersResponse.error || !playerRows) {
      const fallbackPlayers = await supabase
        .from("tournament_players")
        .select("player:players(id, display_name)")
        .eq("tournament_id", activeTournament.id);
      playerRows = (fallbackPlayers.data ?? []).map((row) => ({
        ...row,
        handicap: null,
        is_admin: false,
      }));
    }

    let holeRows = holesResponse.data;
    if (holesResponse.error || !holeRows) {
      const fallback = await supabase
        .from("holes")
        .select("id, hole_number, par, handicap_index, yards")
        .eq("course_id", activeTournament.course_id)
        .order("hole_number");
      holeRows = (fallback.data ?? []).map((hole) => ({
        ...hole,
        yards_purple: null,
      }));
    }

    const loadedPlayers =
      (playerRows ?? [])
        .map((row) => {
          const raw = row as {
            handicap?: number | null;
            is_admin?: boolean | null;
            player: Player | Player[] | null;
          };
          const base = Array.isArray(raw.player)
            ? raw.player[0] ?? null
            : raw.player;
          if (!base) return null;
          return {
            id: base.id,
            display_name: base.display_name,
            handicap: raw.handicap ?? null,
            is_admin: Boolean(raw.is_admin),
          } satisfies Player;
        })
        .filter((p): p is Player => Boolean(p))
        .sort((a, b) => a.display_name.localeCompare(b.display_name)) ?? [];

    setPlayers(loadedPlayers);
    setRounds(
      ((roundRows as Round[]) ?? []).map((round) => ({
        ...round,
        hole_count: round.hole_count === 18 ? 18 : 9,
        nine_label: round.nine_label ?? null,
        play_format: round.play_format ?? null,
      })),
    );
    setHoles(
      ((holeRows as Hole[]) ?? []).map((hole) => ({
        ...hole,
        yards: hole.yards == null ? null : Number(hole.yards),
        yards_purple:
          hole.yards_purple == null ? null : Number(hole.yards_purple),
      })),
    );
    setTeams((teamRows as Team[]) ?? []);
    if (courseRow && "name" in courseRow && typeof courseRow.name === "string") {
      setCourseName(courseRow.name);
    }

    const existing = getSession();
    if (
      existing &&
      existing.tournamentId === activeTournament.id &&
      loadedPlayers.some((p) => p.id === existing.playerId)
    ) {
      setSessionState(existing);
      setPinUnlocked(true);
      setGate("app");
      return;
    }

    setGate("pin");
  });

  useEffect(() => {
    void bootstrap();
  }, []);

  function handlePinSuccess() {
    setPinUnlocked(true);
    setGate("player");
  }

  function handlePlayerSelect(player: Player) {
    if (!tournament) return;
    const next = {
      tournamentId: tournament.id,
      playerId: player.id,
      playerName: player.display_name,
    };
    setSession(next);
    setSessionState(next);
    setGate("app");
    setTab("cup");
  }

  function handleSignOut() {
    clearSession();
    setSessionState(null);
    setPinUnlocked(false);
    setGate("pin");
  }

  if (gate === "loading") {
    return (
      <div className="atmosphere flex min-h-dvh items-center justify-center text-mist">
        Loading the Cup…
      </div>
    );
  }

  if (gate === "error") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 text-ink">
        <h1 className="font-display text-3xl">Can’t connect yet</h1>
        <p className="mt-3 text-muted">{error}</p>
        <p className="mt-4 text-sm text-muted">
          On your computer: check `.env.local`, then restart `npm run dev`. On
          the live Vercel site: set Environment Variables correctly, then
          Redeploy.
        </p>
      </div>
    );
  }

  if (gate === "pin" || !pinUnlocked || !tournament) {
    return (
      <PinGate
        tournamentName={tournament?.name ?? "The Cumberland Cup"}
        expectedPin={tournament?.weekend_pin ?? ""}
        onSuccess={handlePinSuccess}
      />
    );
  }

  if (gate === "player" || !session) {
    return <PlayerPicker players={players} onSelect={handlePlayerSelect} />;
  }

  return (
    <div className="min-h-dvh bg-fog">
      <AppTabs
        active={tab}
        onChange={setTab}
        playerName={session.playerName}
        onSignOut={handleSignOut}
      />
      {tab === "home" ? <HomeTab /> : null}
      {tab === "cup" ? (
        <CupTab
          tournamentId={tournament.id}
          teams={teams}
          rounds={rounds}
          players={players}
          holes={holes}
          sessionPlayerId={session.playerId}
          onGoToPlay={(roundId) => {
            setPlayRoundId(roundId);
            setTab("play");
          }}
        />
      ) : null}
      {tab === "play" ? (
        <PlayTab
          sessionPlayerId={session.playerId}
          sessionPlayerName={session.playerName}
          players={players}
          rounds={rounds}
          holes={holes}
          teams={teams}
          isAdmin={
            players.find((p) => p.id === session.playerId)?.is_admin === true
          }
          initialRoundId={playRoundId}
          onConsumeInitialRound={() => setPlayRoundId(null)}
        />
      ) : null}
      {tab === "teams" ? (
        <TeamsTab
          tournamentId={tournament.id}
          players={players}
          teams={teams}
          isAdmin={
            players.find((p) => p.id === session.playerId)?.is_admin === true
          }
          onPlayersChange={setPlayers}
          onTeamsChange={setTeams}
        />
      ) : null}
      {tab === "course" ? (
        <CourseTab courseName={courseName} holes={holes} />
      ) : null}
    </div>
  );
}
