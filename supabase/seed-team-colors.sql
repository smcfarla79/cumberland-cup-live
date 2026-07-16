-- Sewanee colors: Team A purple, Team B white
-- Official Sewanee purple: #582C83 (Pantone 268)
-- Run in Supabase SQL Editor

update public.teams
set color = '#582C83'
where name = 'Team A';

update public.teams
set color = '#FFFFFF'
where name = 'Team B';
