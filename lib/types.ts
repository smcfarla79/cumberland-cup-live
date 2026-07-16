export type Player = {
  id: string;
  display_name: string;
  handicap: number | null;
  is_admin: boolean;
};

export type Tournament = {
  id: string;
  name: string;
  year: number;
  weekend_pin: string;
  course_id: string;
};

export type PlayFormat =
  | "stroke"
  | "best_ball"
  | "scramble"
  | "shamble"
  | "singles";

export type Round = {
  id: string;
  tournament_id: string;
  name: string;
  day_number: number;
  play_date: string | null;
  scoring_format: "stroke" | "match";
  hole_count?: 9 | 18;
  nine_label?: "front" | "back" | "all" | null;
  play_format?: PlayFormat | null;
};

export type Hole = {
  id: string;
  hole_number: number;
  par: number;
  handicap_index: number | null;
  /** White tee yardage */
  yards: number | null;
  /** Purple (tips / back) tee yardage */
  yards_purple: number | null;
};

export type HoleScore = {
  id?: string;
  round_id: string;
  player_id: string;
  hole_number: number;
  strokes: number;
};

export type Team = {
  id: string;
  tournament_id: string;
  name: string;
  color: string | null;
};

export type TeamAssignment = {
  team_id: string;
  player_id: string;
};

export type Match = {
  id: string;
  round_id: string;
  match_number: number;
  side_size: 1 | 2;
  points_value: number;
  status: "pending" | "complete";
  winning_team_id: string | null;
  is_halved: boolean;
};

export type MatchPlayer = {
  match_id: string;
  player_id: string;
  team_id: string;
};

export type AppSession = {
  tournamentId: string;
  playerId: string;
  playerName: string;
};

export type AppTab = "teams" | "matches" | "cup" | "score" | "course";
