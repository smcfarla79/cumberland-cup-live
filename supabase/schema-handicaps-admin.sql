-- Handicaps, admin access, and round play formats
-- Run in Supabase SQL Editor

alter table public.tournament_players
  add column if not exists handicap int check (handicap is null or handicap between 0 and 54);

alter table public.tournament_players
  add column if not exists is_admin boolean not null default false;

alter table public.rounds
  add column if not exists play_format text
    check (
      play_format is null
      or play_format in (
        'stroke',
        'best_ball',
        'scramble',
        'shamble',
        'singles'
      )
    );

-- Scott McFarlane, James Snover, and Marshall Ussery have full edit access
update public.tournament_players tp
set is_admin = true
from public.players p
where tp.player_id = p.id
  and p.display_name in (
    'Scott McFarlane',
    'James Snover',
    'Marshall Ussery'
  );

-- Tag 2026 sessions with formats
update public.rounds
set play_format = 'stroke'
where id = '00000000-0000-4000-8000-000000000301';

update public.rounds
set play_format = 'best_ball'
where id = '00000000-0000-4000-8000-000000000302';

update public.rounds
set play_format = 'shamble'
where id = '00000000-0000-4000-8000-000000000303';

update public.rounds
set play_format = 'scramble'
where id = '00000000-0000-4000-8000-000000000304';

update public.rounds
set play_format = 'singles'
where id = '00000000-0000-4000-8000-000000000305';
