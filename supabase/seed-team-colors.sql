-- Team colors: Team A gold, Team B green (Play-tab accents)
-- Run in Supabase SQL Editor

update public.teams
set color = '#c4a35a'
where name = 'Team A';

update public.teams
set color = '#2f6b4f'
where name = 'Team B';
