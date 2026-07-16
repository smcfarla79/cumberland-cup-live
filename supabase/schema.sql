-- Cumberland Cup Live — initial schema
-- Run this in Supabase: SQL Editor → New query → paste → Run

-- Course (same course each year)
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.holes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  hole_number int not null check (hole_number between 1 and 18),
  par int not null check (par between 3 and 5),
  handicap_index int check (handicap_index between 1 and 18),
  yards int,
  unique (course_id, hole_number)
);

-- Tournament year
create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  year int not null,
  course_id uuid not null references public.courses (id),
  weekend_pin text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Players (the guys in the group)
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  display_name text not null unique,
  created_at timestamptz not null default now()
);

-- Who is in this year's tournament
create table if not exists public.tournament_players (
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  primary key (tournament_id, player_id)
);

-- Teams created after the draft
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  name text not null,
  color text,
  unique (tournament_id, name)
);

create table if not exists public.team_players (
  team_id uuid not null references public.teams (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  primary key (team_id, player_id)
);

-- Multi-day rounds / sessions (format chosen per round)
create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  name text not null,
  day_number int not null check (day_number >= 1),
  play_date date,
  scoring_format text not null check (scoring_format in ('stroke', 'match')),
  created_at timestamptz not null default now()
);

-- Live hole-by-hole scores (one row per player per hole per round)
create table if not exists public.hole_scores (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  hole_number int not null check (hole_number between 1 and 18),
  strokes int not null check (strokes between 1 and 15),
  updated_at timestamptz not null default now(),
  unique (round_id, player_id, hole_number)
);

-- Temporary open access for early build (friends weekend app).
-- We will tighten this later with PIN + player session rules.
alter table public.courses enable row level security;
alter table public.holes enable row level security;
alter table public.tournaments enable row level security;
alter table public.players enable row level security;
alter table public.tournament_players enable row level security;
alter table public.teams enable row level security;
alter table public.team_players enable row level security;
alter table public.rounds enable row level security;
alter table public.hole_scores enable row level security;

create policy "Allow all on courses" on public.courses for all using (true) with check (true);
create policy "Allow all on holes" on public.holes for all using (true) with check (true);
create policy "Allow all on tournaments" on public.tournaments for all using (true) with check (true);
create policy "Allow all on players" on public.players for all using (true) with check (true);
create policy "Allow all on tournament_players" on public.tournament_players for all using (true) with check (true);
create policy "Allow all on teams" on public.teams for all using (true) with check (true);
create policy "Allow all on team_players" on public.team_players for all using (true) with check (true);
create policy "Allow all on rounds" on public.rounds for all using (true) with check (true);
create policy "Allow all on hole_scores" on public.hole_scores for all using (true) with check (true);
