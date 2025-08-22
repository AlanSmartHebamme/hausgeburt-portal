-- 1. Add a column to the bookings table to track boosted status
alter table public.bookings
add column if not exists is_boosted boolean default false;

comment on column public.bookings.is_boosted is 'Indicates if the request has been boosted (a PRO feature).';
