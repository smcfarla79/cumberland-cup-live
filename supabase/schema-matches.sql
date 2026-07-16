-- Match lineups + Cup results (2v2 or 1v1)
-- Run in Supabase SQL Editor after the earlier seeds

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds (id) on delete cascade,
  match_number int not null check (match_number >= 1),
  -- How many players per side: 2 = 2v2, 1 = singles 1v1
  side_size int not null default 2 check (side_size in (1, 2)),
  -- Cup points awarded to the winning side (halves split this)
  points_value numeric(3, 1) not null default 1.0 check (points_value > 0),
  status text not null default 'pending' check (status in ('pending', 'complete')),
  -- Winning cup team, or null when pending / halved
  winning_team_id uuid references public.teams (id) on delete set null,
  is_halved boolean not null default false,
  created_at timestamptz not null default now(),
  unique (round_id, match_number)
);

create table if not exists public.match_players (
  match_id uuid not null references public.matches (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  primary key (match_id, player_id)
);

alter table public.matches enable row level security;
alter table public.match_players enable row level security;

create policy "Allow all on matches" on public.matches for all using (true) with check (true);
create policy "Allow all on match_players" on public.match_players for all using (true) with check (true);

-- Default side size / points from the Source of Truth round names
update public.rounds
set scoring_format = 'match'
where name ilike '%best ball%'
   or name ilike '%scramble%'
   or name ilike '%shamble%'
   or name ilike '%1v1%'
   or name ilike '%match play%';
