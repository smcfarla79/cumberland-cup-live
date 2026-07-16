"use client";

import { useEffect, useState, useEffectEvent } from "react";
import { PinGate } from "@/components/pin-gate";
import { PlayerPicker } from "@/components/player-picker";
import { RoundPicker } from "@/components/round-picker";
import { ScoreEntry } from "@/components/score-entry";
import { TeamDraft } from "@/components/team-draft";
import { clearSession, getSession, setSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/client";
import type { Hole, Player, Round, Team, Tournament } from "@/lib/types";

type Step =
  | "loading"
  | "pin"
  | "player"
  | "rounds"
  | "draft"
  | "score"
  | "error";

export function CupApp() {
  const [step, setStep] = useState<Step>("loading");
  const [error, setError] = useState("");
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [holes, setHoles] = useState<Hole[]>([]);
  const [session, setSessionState] = useState(getSession());
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [activeRound, setActiveRound] = useState<Round | null>(null);

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
      setStep("error");
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
              "Timed out reaching Supabase. Double-check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart npm run dev.",
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
      setStep("error");
      return;
    }

    if (tournamentError || !tournamentRow) {
      setError(
        tournamentError?.message ??
          "No active tournament found. Check your Supabase seed data.",
      );
      setStep("error");
      return;
    }

    const activeTournament = tournamentRow as Tournament;
    setTournament(activeTournament);

    const [
      { data: playerRows },
      { data: roundRows },
      { data: holeRows },
      { data: teamRows },
    ] = await Promise.all([
      supabase
        .from("tournament_players")
        .select("player:players(id, display_name)")
        .eq("tournament_id", activeTournament.id),
      supabase
        .from("rounds")
        .select("id, tournament_id, name, day_number, play_date, scoring_format")
        .eq("tournament_id", activeTournament.id)
        .order("day_number")
        .order("play_date"),
      supabase
        .from("holes")
        .select("id, hole_number, par, handicap_index, yards")
        .eq("course_id", activeTournament.course_id)
        .order("hole_number"),
      supabase
        .from("teams")
        .select("id, tournament_id, name, color")
        .eq("tournament_id", activeTournament.id)
        .order("name"),
    ]);

    const loadedPlayers =
      (playerRows ?? [])
        .map((row) => {
          const player = row.player as Player | Player[] | null;
          if (Array.isArray(player)) return player[0] ?? null;
          return player;
        })
        .filter((p): p is Player => Boolean(p))
        .sort((a, b) => a.display_name.localeCompare(b.display_name)) ?? [];

    setPlayers(loadedPlayers);
    setRounds((roundRows as Round[]) ?? []);
    setHoles((holeRows as Hole[]) ?? []);
    setTeams((teamRows as Team[]) ?? []);

    const existing = getSession();
    if (
      existing &&
      existing.tournamentId === activeTournament.id &&
      loadedPlayers.some((p) => p.id === existing.playerId)
    ) {
      setSessionState(existing);
      setPinUnlocked(true);
      setStep("rounds");
      return;
    }

    setStep("pin");
  });

  useEffect(() => {
    void bootstrap();
  }, []);

  function handlePinSuccess() {
    setPinUnlocked(true);
    setStep("player");
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
    setStep("rounds");
  }

  function handleSignOut() {
    clearSession();
    setSessionState(null);
    setPinUnlocked(false);
    setActiveRound(null);
    setStep("pin");
  }

  if (step === "loading") {
    return (
      <div className="atmosphere flex min-h-dvh items-center justify-center text-mist">
        Loading the Cup…
      </div>
    );
  }

  if (step === "error") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 text-ink">
        <h1 className="font-display text-3xl">Can’t connect yet</h1>
        <p className="mt-3 text-muted">{error}</p>
        <p className="mt-4 text-sm text-muted">
          On your computer: check `.env.local`, then restart `npm run dev`. On
          the live Vercel site: set Environment Variables to the same Supabase
          URL and anon key (URL must not end with `/rest/v1/`), then Redeploy.
        </p>
      </div>
    );
  }

  if (step === "pin" || !pinUnlocked || !tournament) {
    return (
      <PinGate
        tournamentName={tournament?.name ?? "The Cumberland Cup"}
        expectedPin={tournament?.weekend_pin ?? ""}
        onSuccess={handlePinSuccess}
      />
    );
  }

  if (step === "player" || !session) {
    return <PlayerPicker players={players} onSelect={handlePlayerSelect} />;
  }

  if (step === "draft") {
    return (
      <TeamDraft
        tournamentId={tournament.id}
        players={players}
        teams={teams}
        onBack={() => setStep("rounds")}
      />
    );
  }

  if (step === "score" && activeRound) {
    return (
      <ScoreEntry
        round={activeRound}
        playerId={session.playerId}
        playerName={session.playerName}
        holes={holes}
        onBack={() => {
          setActiveRound(null);
          setStep("rounds");
        }}
      />
    );
  }

  return (
    <RoundPicker
      playerName={session.playerName}
      rounds={rounds}
      onSelect={(round) => {
        setActiveRound(round);
        setStep("score");
      }}
      onOpenDraft={() => setStep("draft")}
      onSignOut={handleSignOut}
    />
  );
}
