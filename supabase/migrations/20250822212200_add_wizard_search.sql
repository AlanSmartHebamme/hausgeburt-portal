-- Create a new RPC function specifically for the parent wizard
create or replace function public.wizard_match_midwives(
  p_postal_code text,
  p_due_date date,
  p_services text[]
)
returns table (
  id uuid,
  display_name text,
  city text,
  postal_code text,
  about text,
  distance double precision,
  plan text,
  capacity_status text
) as $$
declare
  search_lat double precision;
  search_lon double precision;
begin
  -- 1. Get coordinates for the searched postal code
  select latitude, longitude
  into search_lat, search_lon
  from public.postal_codes
  where public.postal_codes.postal_code = p_postal_code
  limit 1;

  -- If the postal code was not found, return an empty set
  if search_lat is null or search_lon is null then
    return;
  end if;

  -- 2. Find and rank midwives based on wizard criteria
  return query
  select
    p.id,
    p.display_name,
    p.city,
    p.postal_code,
    p.bio as about,
    haversine_distance(search_lat, search_lon, p.latitude, p.longitude) as distance,
    p.plan,
    public.get_midwife_capacity_status(p.id) as capacity_status
  from
    public.profiles p
  where
    p.role = 'MIDWIFE'
    and p.completed = true
    and p.latitude is not null
    and p.longitude is not null
    -- Location filter: User's location must be within the midwife's service radius
    and haversine_distance(search_lat, search_lon, p.latitude, p.longitude) <= p.radius_km
    
    -- Service filter: Midwife must offer all requested services
    and p.services @> p_services
    
    -- Availability filter: Midwife must have an availability slot covering the due date
    and exists (
      select 1
      from public.availability a
      where a.midwife_id = p.id
        and a.start_date <= p_due_date
        and a.end_date >= p_due_date
    )
  order by
    -- 1. Pro-Boost
    case when p.plan = 'PRO' then 0 else 1 end,
    -- 2. Capacity
    case 
      when public.get_midwife_capacity_status(p.id) = 'GREEN' then 0
      when public.get_midwife_capacity_status(p.id) = 'YELLOW' then 1
      else 2
    end,
    -- 3. Distance
    distance,
    -- 4. Random
    random()
  limit 7; -- Return top 7 matches as per roadmap
end;
$$ language plpgsql;

grant execute on function public.wizard_match_midwives(text, date, text[]) to anon, authenticated;
