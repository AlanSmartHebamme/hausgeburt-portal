-- 1. Add a unique calendar ID to each profile for secure feed URLs
alter table public.profiles
add column if not exists calendar_id uuid default gen_random_uuid() not null;

-- 2. Add a unique constraint to the new column
alter table public.profiles
add constraint profiles_calendar_id_key unique (calendar_id);

comment on column public.profiles.calendar_id is 'A unique, secret ID for generating iCal feed URLs.';
