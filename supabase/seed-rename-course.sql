-- Fix course name to match 2026 CC Source of Truth
-- Run in Supabase SQL Editor

update public.courses
set name = 'The Course at Sewanee'
where id = '00000000-0000-4000-8000-000000000001';
