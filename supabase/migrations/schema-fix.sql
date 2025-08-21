-- This is a consolidated script to fix and align your database schema.
-- Please run this entire script in your Supabase SQL editor.

-- 1. Ensure the 'profiles' table has all required columns
-- This statement is safe to run even if the table exists.
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  role text check (role in ('MIDWIFE','CLIENT','ADMIN')) not null,
  display_name text,
  city text,
  postal_code text,
  radius_km int,
  bio text,
  qualifications text,
  phone text,
  price_model text, -- Removed CHECK constraint for now to avoid conflicts
  plan text default 'FREE' check (plan in ('FREE','PRO')),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  offers_homebirth boolean default false,
  completed boolean default false,
  latitude double precision,
  longitude double precision
);

-- Add columns just in case the table already existed in a minimal form
alter table public.profiles
  add column if not exists role text check (role in ('MIDWIFE','CLIENT','ADMIN')),
  add column if not exists display_name text,
  add column if not exists city text,
  add column if not exists postal_code text,
  add column if not exists radius_km int,
  add column if not exists bio text,
  add column if not exists qualifications text,
  add column if not exists phone text,
  add column if not exists price_model text,
  add column if not exists plan text default 'FREE' check (plan in ('FREE','PRO')),
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now(),
  add column if not exists offers_homebirth boolean default false,
  add column if not exists completed boolean default false,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;


-- 2. Create the 'postal_codes' table
create table if not exists public.postal_codes (
  id bigserial primary key,
  country_code text not null default 'DE',
  postal_code text not null,
  city text,
  latitude double precision not null,
  longitude double precision not null,
  unique(country_code, postal_code)
);

-- 3. Create helper and search functions
create or replace function public.haversine_distance(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision)
returns double precision as $$
declare
    radius_km float = 6371;
    d_lat float;
    d_lon float;
    a float;
    c float;
begin
    d_lat = radians(lat2 - lat1);
    d_lon = radians(lon2 - lon1);
    a = sin(d_lat / 2) * sin(d_lat / 2) +
        cos(radians(lat1)) * cos(radians(lat2)) *
        sin(d_lon / 2) * sin(d_lon / 2);
    c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return radius_km * c;
end;
$$ language plpgsql;

create or replace function public.search_midwives_by_radius(p_postal_code text, p_radius_km int)
returns table (
  id uuid, display_name text, city text, postal_code text, radius_km int,
  about text, price_model text, distance double precision
) as $$
declare
  search_lat double precision;
  search_lon double precision;
begin
  -- Get the coordinates for the searched postal code
  select latitude, longitude
  into search_lat, search_lon
  from public.postal_codes
  where public.postal_codes.postal_code = p_postal_code
  limit 1;

  -- If the postal code was not found, return an empty set
  if search_lat is null or search_lon is null then
    return;
  end if;

  -- Return all midwives within the specified radius
  return query
  select
    p.id,
    p.display_name,
    p.city,
    p.postal_code,
    p.radius_km,
    p.bio as about, -- Assuming 'bio' is the correct column name now
    p.price_model,
    haversine_distance(search_lat, search_lon, p.latitude, p.longitude) as distance
  from
    public.profiles p
  where
    p.role = 'MIDWIFE'
    and p.completed = true -- Only show completed profiles in search results
    and p.latitude is not null
    and p.longitude is not null
    -- The midwife must be within the user's search radius
    and haversine_distance(search_lat, search_lon, p.latitude, p.longitude) <= p_radius_km
    -- AND the user's location must be within the midwife's own service radius
    and haversine_distance(search_lat, search_lon, p.latitude, p.longitude) <= p.radius_km
  order by
    distance;
end;
$$ language plpgsql security definer;

-- 4. Create the trigger to auto-populate coordinates
create or replace function public.handle_profile_postal_code_update()
returns trigger as $$
declare
  pc_lat double precision;
  pc_lon double precision;
begin
  -- If postal_code is new or has changed, try to find its coordinates
  if new.postal_code is not null and (tg_op = 'INSERT' or new.postal_code <> old.postal_code) then
    select latitude, longitude
    into pc_lat, pc_lon
    from public.postal_codes
    where postal_code = new.postal_code
    limit 1;

    -- If found, update the profile's coordinates
    if pc_lat is not null and pc_lon is not null then
      new.latitude := pc_lat;
      new.longitude := pc_lon;
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- 5. Grant permissions and attach trigger
grant execute on function public.haversine_distance(double precision, double precision, double precision, double precision) to anon, authenticated;
grant execute on function public.search_midwives_by_radius(text, int) to anon, authenticated;

drop trigger if exists on_profile_postal_code_change on public.profiles;
create trigger on_profile_postal_code_change
before insert or update of postal_code on public.profiles
for each row execute function public.handle_profile_postal_code_update();

-- 6. Insert sample postal data
insert into public.postal_codes (postal_code, city, latitude, longitude) values
('10115', 'Berlin', 52.5200, 13.4050),
('76139', 'Karlsruhe', 49.0297, 8.4632)
on conflict (country_code, postal_code) do nothing;
