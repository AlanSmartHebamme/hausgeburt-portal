-- 1. Create a table to store postal codes and their coordinates
create table if not exists public.postal_codes (
  id bigserial primary key,
  country_code text not null default 'DE',
  postal_code text not null,
  city text,
  latitude double precision not null,
  longitude double precision not null,
  unique(country_code, postal_code)
);
comment on table public.postal_codes is 'Stores postal codes and their corresponding geographic coordinates.';

-- 2. Add location columns to the profiles table
alter table public.profiles
add column if not exists city text,
add column if not exists postal_code text,
add column if not exists radius_km int,
add column if not exists latitude double precision,
add column if not exists longitude double precision,
add column if not exists offers_homebirth boolean default false,
add column if not exists completed boolean default false;
comment on column public.profiles.postal_code is 'The midwife''s postal code, used to derive coordinates.';
comment on column public.profiles.latitude is 'Latitude of the midwife''s primary location.';
comment on column public.profiles.longitude is 'Longitude of the midwife''s primary location.';

-- 3. Create a function to calculate the distance between two geo-points (Haversine formula)
create or replace function public.haversine_distance(lat1 double precision, lon1 double precision, lat2 double precision, lon2 double precision)
returns double precision as $$
declare
    radius_km float = 6371; -- Earth's radius in kilometers
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
comment on function public.haversine_distance is 'Calculates the distance between two points in kilometers using the Haversine formula.';

-- Grant execution rights for the helper function as well
grant execute on function public.haversine_distance(double precision, double precision, double precision, double precision) to anon, authenticated;

-- 4. Create the main RPC function for searching (V2 with advanced ranking)
create or replace function public.search_midwives_by_radius(p_postal_code text, p_radius_km int)
returns table (
  id uuid,
  display_name text,
  city text,
  postal_code text,
  radius_km int,
  about text,
  price_model text,
  distance double precision,
  plan text,
  capacity_status text
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
    p.bio as about,
    p.price_model,
    haversine_distance(search_lat, search_lon, p.latitude, p.longitude) as distance,
    p.plan,
    public.get_midwife_capacity_status(p.id) as capacity_status
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
    -- 1. Pro-Boost: PRO users first
    case when p.plan = 'PRO' then 0 else 1 end,
    -- 2. Capacity: GREEN, then YELLOW, then RED
    case 
      when public.get_midwife_capacity_status(p.id) = 'GREEN' then 0
      when public.get_midwife_capacity_status(p.id) = 'YELLOW' then 1
      else 2
    end,
    -- 3. Distance: Closer midwives first
    distance,
    -- 4. Random component to shuffle similar results
    random();
end;
$$ language plpgsql security definer;
comment on function public.search_midwives_by_radius is 'Searches for midwives within a given radius of a postal code. SECURITY DEFINER allows it to bypass RLS.';

-- 6. Grant execution rights to public roles
grant execute on function public.search_midwives_by_radius(text, int) to anon, authenticated;

-- 7. Create a trigger function to auto-populate coordinates on profile update
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
comment on function public.handle_profile_postal_code_update is 'When a profile''s postal code is updated, this trigger finds the corresponding coordinates and updates the profile.';

-- 8. Attach the trigger to the profiles table
drop trigger if exists on_profile_postal_code_change on public.profiles;
create trigger on_profile_postal_code_change
before insert or update of postal_code on public.profiles
for each row execute function public.handle_profile_postal_code_update();


-- 5. Insert some sample data for German cities
insert into public.postal_codes (postal_code, city, latitude, longitude) values
('10115', 'Berlin', 52.5200, 13.4050),
('20095', 'Hamburg', 53.5511, 9.9937),
('80331', 'München', 48.1351, 11.5820),
('50667', 'Köln', 50.9375, 6.9603),
('60311', 'Frankfurt am Main', 50.1109, 8.6821),
('70173', 'Stuttgart', 48.7758, 9.1829),
('77933', 'Lahr/Schwarzwald', 48.3375, 7.8722)
on conflict (country_code, postal_code) do nothing;
