-- 1. Create a table to store metadata for profile media
create table if not exists public.profile_media (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone not null default now(),
  
  profile_id uuid not null references public.profiles(id) on delete cascade,
  
  storage_path text not null,
  file_name text,
  media_type text not null, -- 'GALLERY' or 'CERTIFICATE'
  
  unique(profile_id, storage_path)
);

comment on table public.profile_media is 'Stores metadata for midwife profile media (gallery, certificates).';
comment on column public.profile_media.media_type is 'Type of media: GALLERY or CERTIFICATE.';

-- 2. Enable RLS for the new table
alter table public.profile_media enable row level security;

create policy "Public can see profile media"
on public.profile_media for select
using ( true );

create policy "Midwives can manage their own media"
on public.profile_media for all -- insert, update, delete
using ( auth.uid() = profile_id );


-- 3. Create a Supabase Storage bucket for profile media
-- Note: This SQL only sets up the policies. The bucket itself must be created
-- in the Supabase Dashboard (Storage -> Create a new bucket) with the name 'profile_media'.
-- It should be a PUBLIC bucket.

insert into storage.buckets (id, name, public)
values ('profile_media', 'profile_media', true)
on conflict (id) do nothing;

-- 4. Set up RLS policies for the storage bucket
create policy "Midwives can upload to their own folder"
on storage.objects for insert
with check (
  bucket_id = 'profile_media' and
  -- Path should be profile_id/filename.ext
  auth.uid() = (string_to_array(name, '/'))[1]::uuid
);

create policy "Midwives can see their own media"
on storage.objects for select
using (
  bucket_id = 'profile_media' and
  auth.uid() = (string_to_array(name, '/'))[1]::uuid
);

create policy "Midwives can delete their own media"
on storage.objects for delete
using (
  bucket_id = 'profile_media' and
  auth.uid() = (string_to_array(name, '/'))[1]::uuid
);

-- Public can view any media in the bucket
create policy "Public can view all profile media"
on storage.objects for select
using ( bucket_id = 'profile_media' );
