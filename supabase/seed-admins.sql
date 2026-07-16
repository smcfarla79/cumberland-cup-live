-- Grant admin access to Scott, James, and Marshall
-- Run in Supabase SQL Editor

update public.tournament_players tp
set is_admin = true
from public.players p
where tp.player_id = p.id
  and p.display_name in (
    'Scott McFarlane',
    'James Snover',
    'Marshall Ussery'
  );

-- Confirm
select p.display_name, tp.is_admin
from public.tournament_players tp
join public.players p on p.id = tp.player_id
where p.display_name in (
  'Scott McFarlane',
  'James Snover',
  'Marshall Ussery'
)
order by p.display_name;
