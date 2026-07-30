export type PlayerRosterStatus = "active" | "ir";

/**
 * Players on injured reserve — can sign in on the picker, but are excluded
 * from draft / lineup pools so they don't fill a competitive roster slot.
 */
export const IR_PLAYER_IDS = new Set<string>([
  "00000000-0000-4000-8000-000000000121", // Larson Heitzenrater
]);

export function rosterStatusForPlayerId(playerId: string): PlayerRosterStatus {
  return IR_PLAYER_IDS.has(playerId) ? "ir" : "active";
}

export function isActiveRosterPlayer(player: { id: string }): boolean {
  return rosterStatusForPlayerId(player.id) === "active";
}
