-- 1. Create a table to handle disputes related to bookings
create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  
  booking_id uuid not null references public.bookings(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  
  reason text not null,
  
  status text not null default 'OPEN', -- OPEN, RESOLVED
  resolution text, -- Notes from the admin on how it was resolved
  
  unique(booking_id) -- Only one dispute per booking
);

comment on table public.disputes is 'Stores information about disputes filed for bookings.';
comment on column public.disputes.status is 'The current status of the dispute (OPEN, RESOLVED).';

-- 2. Enable RLS for the new table
alter table public.disputes enable row level security;

create policy "Users can see disputes related to their bookings"
on public.disputes for select
using (
  exists (
    select 1 from public.bookings
    where bookings.id = disputes.booking_id
      and (bookings.client_id = auth.uid() or bookings.midwife_id = auth.uid())
  )
);

create policy "Users can create disputes for their bookings"
on public.disputes for insert
with check (
  auth.uid() = reporter_id and
  exists (
    select 1 from public.bookings
    where bookings.id = disputes.booking_id
      and (bookings.client_id = auth.uid() or bookings.midwife_id = auth.uid())
  )
);

-- Note: Policies for admins to update/resolve disputes would be needed.
-- This would typically check against a custom claim or an admin role in the profiles table.
-- create policy "Admins can manage all disputes"
-- on public.disputes for all
-- using ( (select role from public.profiles where id = auth.uid()) = 'ADMIN' );
