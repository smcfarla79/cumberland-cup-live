export type Player = {
  id: string;
  display_name: string;
};

export type Tournament = {
  id: string;
  name: string;
  year: number;
  weekend_pin: string;
  course_id: string;
};

export type Round = {
  id: string;
  tournament_id: string;
  name: string;
  day_number: number;
  play_date: string | null;
  scoring_format: "stroke" | "match";
};

export type Hole = {
  id: string;
  hole_number: number;
  par: number;
  handicap_index: number | null;
  yards: number | null;
};

export type HoleScore = {
  id?: string;
  round_id: string;
  player_id: string;
  hole_number: number;
  strokes: number;
};

export type AppSession = {
  tournamentId: string;
  playerId: string;
  playerName: string;
};
