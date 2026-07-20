-- Nine-hole course / match sessions
-- Front 9 = scorecard holes 1–9 (one tee setup).
-- Back 9  = scorecard holes 10–18 (same physical holes, different tees/pars).
-- Singles can be 9 or 18 later.
-- Run in Supabase SQL Editor

alter table public.rounds
  add column if not exists hole_count int not null default 9
    check (hole_count in (9, 18));

alter table public.rounds
  add column if not exists nine_label text
    check (nine_label is null or nine_label in ('front', 'back', 'all'));

-- 2026 Cumberland Cup sessions
update public.rounds
set
  hole_count = 9,
  nine_label = 'front',
  name = 'Friday AM — Front 9 · 2-man best ball (1 pt)'
where id = '00000000-0000-4000-8000-000000000302';

update public.rounds
set
  hole_count = 9,
  nine_label = 'back',
  name = 'Friday PM — Back 9 · 2-man shamble (1 pt)'
where id = '00000000-0000-4000-8000-000000000303';

update public.rounds
set
  hole_count = 9,
  nine_label = 'front',
  name = 'Saturday AM — Front 9 · 2-man scramble (1 pt)'
where id = '00000000-0000-4000-8000-000000000304';

-- Singles: default full scorecard 1–18 (front tees then back tees)
update public.rounds
set
  hole_count = 18,
  nine_label = 'all',
  name = 'Saturday — Singles match play (2 pts)'
where id = '00000000-0000-4000-8000-000000000305';

update public.rounds
set
  hole_count = 9,
  nine_label = 'front',
  name = 'Thursday Seeding — Front 9 · individual stroke'
where id = '00000000-0000-4000-8000-000000000301';
