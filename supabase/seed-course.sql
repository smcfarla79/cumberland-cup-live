-- Seed course + scorecard holes for The Course at Sewanee
-- Run in Supabase SQL Editor after schema.sql
--
-- This is a 9-hole course played from two tee setups on the scorecard:
--   Holes 1–9  = Front nine (one set of tees / pars / yardages)
--   Holes 10–18 = Back nine (SAME physical holes, different tees —
--                 often different par & yardage; e.g. hole 1 vs hole 10)
-- yards = White tees, yards_purple = Purple tees

insert into public.courses (id, name)
values ('00000000-0000-4000-8000-000000000001', 'The Course at Sewanee')
on conflict (id) do update
set name = excluded.name;

insert into public.holes (course_id, hole_number, par, handicap_index, yards, yards_purple)
values
  -- Front
  ('00000000-0000-4000-8000-000000000001', 1,  4, 1,  413, 461),
  ('00000000-0000-4000-8000-000000000001', 2,  5, 3,  533, 533),
  ('00000000-0000-4000-8000-000000000001', 3,  3, 13, 163, 187),
  ('00000000-0000-4000-8000-000000000001', 4,  4, 17, 246, 246),
  ('00000000-0000-4000-8000-000000000001', 5,  3, 11, 185, 218),
  ('00000000-0000-4000-8000-000000000001', 6,  4, 5,  344, 437),
  ('00000000-0000-4000-8000-000000000001', 7,  4, 9,  392, 402),
  ('00000000-0000-4000-8000-000000000001', 8,  4, 15, 315, 315),
  ('00000000-0000-4000-8000-000000000001', 9,  5, 7,  504, 513),
  -- Back (physical holes 1–9 again, different tees)
  ('00000000-0000-4000-8000-000000000001', 10, 5, 2,  525, 556),
  ('00000000-0000-4000-8000-000000000001', 11, 5, 4,  500, 500),
  ('00000000-0000-4000-8000-000000000001', 12, 3, 14, 140, 177),
  ('00000000-0000-4000-8000-000000000001', 13, 4, 18, 264, 264),
  ('00000000-0000-4000-8000-000000000001', 14, 3, 8,  156, 200),
  ('00000000-0000-4000-8000-000000000001', 15, 4, 6,  427, 427),
  ('00000000-0000-4000-8000-000000000001', 16, 4, 10, 381, 417),
  ('00000000-0000-4000-8000-000000000001', 17, 4, 16, 362, 371),
  ('00000000-0000-4000-8000-000000000001', 18, 4, 12, 459, 478)
on conflict (course_id, hole_number) do update
set
  par = excluded.par,
  handicap_index = excluded.handicap_index,
  yards = excluded.yards,
  yards_purple = excluded.yards_purple;
