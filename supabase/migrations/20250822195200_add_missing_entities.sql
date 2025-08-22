-- 1. Add missing columns to profiles table
alter table public.profiles
add column if not exists verified boolean default false,
add column if not exists languages text[],
add column if not exists services text[];

comment on column public.profiles.verified is 'Indicates if a midwife''s profile has been verified by an admin.';
comment on column public.profiles.languages is 'Array of languages spoken by the midwife.';
comment on column public.profiles.services is 'Array of services offered by the midwife.';


-- 2. Create the bookings table (renamed from requests for clarity)
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  
  client_id uuid not null references public.profiles(id) on delete cascade,
  midwife_id uuid not null references public.profiles(id) on delete cascade,
  
  -- REQUESTED, CONFIRMED, DECLINED, PAID, CANCELED, COMPLETED
  status text not null default 'REQUESTED', 
  message text,
  
  -- Ensure a client can only send one active request to a midwife
  unique(client_id, midwife_id)
);

comment on table public.bookings is 'Stores booking requests and their lifecycle from clients to midwives.';
comment on column public.bookings.status is 'The current status of the booking (REQUESTED, CONFIRMED, DECLINED, PAID, CANCELED, COMPLETED).';

-- 3. Enable RLS and define policies for bookings table
alter table public.bookings enable row level security;

create policy "Clients can see their own bookings"
on public.bookings for select
using ( auth.uid() = client_id );

create policy "Midwives can see bookings made to them"
on public.bookings for select
using ( auth.uid() = midwife_id );

create policy "Clients can create bookings"
on public.bookings for insert
with check ( auth.uid() = client_id );

create policy "Users can update their own bookings (e.g., status)"
on public.bookings for update
using ( auth.uid() = client_id or auth.uid() = midwife_id );


-- 4. Create the reviews table
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  
  client_id uuid not null references public.profiles(id) on delete cascade,
  midwife_id uuid not null references public.profiles(id) on delete cascade,
  
  rating int not null check (rating >= 1 and rating <= 5),
  comment text,
  
  -- A client can only review a midwife once
  unique(client_id, midwife_id)
);

comment on table public.reviews is 'Stores client reviews for midwives.';

-- 5. Enable RLS and define policies for reviews table
alter table public.reviews enable row level security;

create policy "Everyone can see reviews"
on public.reviews for select
using ( true );

create policy "Clients can create reviews for midwives they have worked with"
on public.reviews for insert
with check (
  auth.uid() = client_id and
  exists (
    select 1
    from public.bookings
    where bookings.client_id = auth.uid()
      and bookings.midwife_id = reviews.midwife_id
      -- A review can be left after the booking is confirmed, paid, or completed
      and bookings.status in ('CONFIRMED', 'PAID', 'COMPLETED')
  )
);

create policy "Clients can update their own reviews"
on public.reviews for update
using ( auth.uid() = client_id );


-- 6. Create the availability table
create table if not exists public.availability (
  id bigserial primary key,
  midwife_id uuid not null references public.profiles(id) on delete cascade,
  
  -- Using a date range for flexibility
  start_date date not null,
  end_date date not null,
  
  -- Optional: A note for the availability slot
  note text,

  unique(midwife_id, start_date, end_date)
);

comment on table public.availability is 'Stores availability slots for midwives.';

-- 7. Enable RLS and define policies for availability table
alter table public.availability enable row level security;

create policy "Everyone can see availability"
on public.availability for select
using ( true );

create policy "Midwives can manage their own availability"
on public.availability for all -- insert, update, delete
using ( auth.uid() = midwife_id );


-- 8. Create function to determine capacity status (traffic light)
create or replace function public.get_midwife_capacity_status(midwife_id uuid)
returns text as $$
declare
  upcoming_availability_count int;
begin
  select count(*)
  into upcoming_availability_count
  from public.availability a
  where a.midwife_id = get_midwife_capacity_status.midwife_id
    and a.end_date >= now()::date
    and a.start_date <= (now() + interval '3 months')::date;

  if upcoming_availability_count > 2 then
    return 'GREEN'; -- Available
  elsif upcoming_availability_count > 0 then
    return 'YELLOW'; -- Limited availability
  else
    return 'RED'; -- Booked up
  end if;
end;
$$ language plpgsql stable;

comment on function public.get_midwife_capacity_status is 'Returns a capacity status (GREEN, YELLOW, RED) for a midwife based on upcoming availability.';

grant execute on function public.get_midwife_capacity_status(uuid) to anon, authenticated;
