-- 2026 Cumberland Cup — tournament, players, and planned rounds
-- Source: 2026 CC Source of Truth PDF
-- Run in Supabase SQL Editor after seed-course.sql
-- Note: phone numbers are intentionally NOT stored here (keep those offline).

-- Tournament
insert into public.tournaments (id, name, year, course_id, weekend_pin, is_active)
values (
  '00000000-0000-4000-8000-000000000010',
  'The 2026 Cumberland Cup',
  2026,
  '00000000-0000-4000-8000-000000000001',
  '2026', -- change this PIN later to whatever you want the guys to use
  true
)
on conflict (id) do update
set
  name = excluded.name,
  year = excluded.year,
  course_id = excluded.course_id,
  is_active = excluded.is_active;

-- Players (20 attendees)
insert into public.players (id, display_name) values
  ('00000000-0000-4000-8000-000000000101', 'Ben Clune'),
  ('00000000-0000-4000-8000-000000000102', 'Billy Collins'),
  ('00000000-0000-4000-8000-000000000103', 'Tommy Concklin'),
  ('00000000-0000-4000-8000-000000000104', 'Brett Cooper'),
  ('00000000-0000-4000-8000-000000000105', 'Jackson Cooper'),
  ('00000000-0000-4000-8000-000000000106', 'Andy Franks'),
  ('00000000-0000-4000-8000-000000000107', 'Tyler Fullerton'),
  ('00000000-0000-4000-8000-000000000108', 'Andrew Heitzenrater'),
  ('00000000-0000-4000-8000-000000000109', 'Larson Heitzenrater'),
  ('00000000-0000-4000-8000-000000000110', 'Rand Jackson'),
  ('00000000-0000-4000-8000-000000000111', 'Harrison Lee'),
  ('00000000-0000-4000-8000-000000000112', 'Garrett Liebe'),
  ('00000000-0000-4000-8000-000000000113', 'Scott McFarlane'),
  ('00000000-0000-4000-8000-000000000114', 'Will Moore'),
  ('00000000-0000-4000-8000-000000000115', 'Hurst Renner'),
  ('00000000-0000-4000-8000-000000000116', 'Taylor Rowe'),
  ('00000000-0000-4000-8000-000000000117', 'Shane Shelly'),
  ('00000000-0000-4000-8000-000000000118', 'James Snover'),
  ('00000000-0000-4000-8000-000000000119', 'Marshall Ussery'),
  ('00000000-0000-4000-8000-000000000120', 'Mike Walker')
on conflict (display_name) do nothing;

-- Link all players to this tournament
insert into public.tournament_players (tournament_id, player_id)
select
  '00000000-0000-4000-8000-000000000010',
  id
from public.players
where display_name in (
  'Ben Clune',
  'Billy Collins',
  'Tommy Concklin',
  'Brett Cooper',
  'Jackson Cooper',
  'Andy Franks',
  'Tyler Fullerton',
  'Andrew Heitzenrater',
  'Larson Heitzenrater',
  'Rand Jackson',
  'Harrison Lee',
  'Garrett Liebe',
  'Scott McFarlane',
  'Will Moore',
  'Hurst Renner',
  'Taylor Rowe',
  'Shane Shelly',
  'James Snover',
  'Marshall Ussery',
  'Mike Walker'
)
on conflict do nothing;

-- Empty teams for draft night (assign players later in the app)
insert into public.teams (id, tournament_id, name, color) values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000010', 'Team A', '#c4a35a'),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000010', 'Team B', '#16352a')
on conflict (tournament_id, name) do update
set color = excluded.color;

-- Planned rounds from the Source of Truth
-- scoring_format is simplified for v1: stroke | match
-- Detailed format lives in the round name for now
insert into public.rounds (id, tournament_id, name, day_number, play_date, scoring_format) values
  (
    '00000000-0000-4000-8000-000000000301',
    '00000000-0000-4000-8000-000000000010',
    'Thursday Seeding — Front 9 · individual stroke',
    1,
    '2026-07-30',
    'stroke'
  ),
  (
    '00000000-0000-4000-8000-000000000302',
    '00000000-0000-4000-8000-000000000010',
    'Friday AM — Front 9 · 2-man best ball (1 pt)',
    2,
    '2026-07-31',
    'match'
  ),
  (
    '00000000-0000-4000-8000-000000000303',
    '00000000-0000-4000-8000-000000000010',
    'Friday PM — Back 9 · scramble/shamble (1 pt)',
    2,
    '2026-07-31',
    'match'
  ),
  (
    '00000000-0000-4000-8000-000000000304',
    '00000000-0000-4000-8000-000000000010',
    'Saturday AM — Front 9 · 2-man scramble (1 pt)',
    3,
    '2026-08-01',
    'match'
  ),
  (
    '00000000-0000-4000-8000-000000000305',
    '00000000-0000-4000-8000-000000000010',
    'Saturday — Singles match play (2 pts)',
    3,
    '2026-08-01',
    'match'
  )
on conflict (id) do update
set
  name = excluded.name,
  day_number = excluded.day_number,
  play_date = excluded.play_date,
  scoring_format = excluded.scoring_format;
