-- Team colors: Team A gold, Team B green
-- Run in Supabase SQL Editor

update public.teams
set color = '#c4a35a'
where name = 'Team A';

update public.teams
set color = '#16352a'
where name = 'Team B';
