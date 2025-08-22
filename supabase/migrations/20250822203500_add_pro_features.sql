-- 1. Create table to store profile view events
create table if not exists public.profile_views (
  id bigserial primary key,
  created_at timestamp with time zone not null default now(),
  
  -- The profile that was viewed
  profile_id uuid not null references public.profiles(id) on delete cascade,
  
  -- Optional: The user who viewed the profile
  viewer_id uuid references public.profiles(id) on delete set null
);

comment on table public.profile_views is 'Logs view events for midwife profiles.';

-- 2. Enable RLS for the new table
alter table public.profile_views enable row level security;

-- For now, no one can read the view logs directly, only via functions.
-- Midwives can't see who viewed them, only aggregated counts.

create policy "Users can log a profile view"
on public.profile_views for insert
with check ( true ); -- Anyone can trigger a view log


-- 3. Create a function to log a profile view
create or replace function public.log_profile_view(p_profile_id uuid)
returns void as $$
begin
  insert into public.profile_views (profile_id, viewer_id)
  values (p_profile_id, auth.uid());
end;
$$ language plpgsql volatile;

comment on function public.log_profile_view is 'Inserts a record into the profile_views table.';

grant execute on function public.log_profile_view(uuid) to anon, authenticated;


-- 4. Create a function to get profile statistics for a midwife
create or replace function public.get_profile_stats(p_midwife_id uuid)
returns table (
  view_count int,
  request_count int,
  acceptance_rate float
) as $$
begin
  return query
  with booking_stats as (
    select
      count(*) as total_requests,
      count(*) filter (where status in ('CONFIRMED', 'PAID', 'COMPLETED')) as accepted_requests
    from public.bookings
    where midwife_id = p_midwife_id
  )
  select
    (select count(*) from public.profile_views where profile_id = p_midwife_id)::int as view_count,
    bs.total_requests::int as request_count,
    case 
      when bs.total_requests > 0 then (bs.accepted_requests::float / bs.total_requests::float) * 100
      else 0 
    end as acceptance_rate
  from booking_stats bs;
end;
$$ language plpgsql stable;

comment on function public.get_profile_stats is 'Returns aggregated statistics (views, requests, acceptance rate) for a midwife.';

-- Only the midwife herself should be able to see her stats
grant execute on function public.get_profile_stats(uuid) to authenticated;
-- We will enforce the "is it my own profile" check in the RLS policy of the function if needed,
-- or more simply, in the API layer before calling the function.
