-- Fix White + Purple yardages on The Course at Sewanee scorecard
-- Run this entire snippet in Supabase SQL Editor
-- Source: BlueGolf detailed scorecard (sewaneegtennisc)

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
  (1,  5, 1,  525, 556),
  (2,  5, 3,  500, 500),
  (3,  3, 13, 140, 177),
  (4,  4, 17, 264, 264),
  (5,  3, 11, 156, 200),
  (6,  4, 5,  427, 427),
  (7,  4, 9,  381, 417),
  (8,  4, 15, 362, 371),
  (9,  4, 7,  459, 478),
  (10, 4, 2,  413, 461),
  (11, 5, 4,  533, 533),
  (12, 3, 14, 163, 187),
  (13, 4, 18, 246, 246),
  (14, 3, 8,  185, 218),
  (15, 4, 6,  344, 437),
  (16, 4, 10, 392, 402),
  (17, 4, 16, 315, 315),
  (18, 5, 12, 504, 513)
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
