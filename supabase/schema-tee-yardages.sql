-- Fix White + Purple yardages on The Course at Sewanee scorecard
-- Run this entire snippet in Supabase SQL Editor

alter table public.holes
  add column if not exists yards_purple int;

-- Upsert every hole with White (yards) + Purple (yards_purple)
insert into public.holes (course_id, hole_number, par, handicap_index, yards, yards_purple)
select
  c.id,
  v.hole_number,
  v.par,
  v.hcp,
  v.white,
  v.purple
from public.courses c
cross join (values
  (1,  4, 1,  413, 461),
  (2,  5, 3,  533, 533),
  (3,  3, 13, 163, 187),
  (4,  4, 17, 246, 246),
  (5,  3, 11, 185, 218),
  (6,  4, 5,  344, 437),
  (7,  4, 9,  392, 402),
  (8,  4, 15, 315, 315),
  (9,  5, 7,  504, 513),
  (10, 5, 2,  525, 556),
  (11, 5, 4,  500, 500),
  (12, 3, 14, 140, 177),
  (13, 4, 18, 264, 264),
  (14, 3, 8,  156, 200),
  (15, 4, 6,  427, 427),
  (16, 4, 10, 381, 417),
  (17, 4, 16, 362, 371),
  (18, 4, 12, 459, 478)
) as v(hole_number, par, hcp, white, purple)
where c.name = 'The Course at Sewanee'
on conflict (course_id, hole_number) do update
set
  par = excluded.par,
  handicap_index = excluded.handicap_index,
  yards = excluded.yards,
  yards_purple = excluded.yards_purple;

-- Quick check (should show numbers, not blank)
select hole_number, par, yards as white, yards_purple as purple
from public.holes
order by hole_number;
