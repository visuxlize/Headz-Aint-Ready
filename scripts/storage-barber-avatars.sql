-- Run once in Supabase SQL Editor (Dashboard → SQL).
-- Creates a public bucket for barber profile photos uploaded via /api/barber/profile (service role).

insert into storage.buckets (id, name, public)
values ('barber-avatars', 'barber-avatars', true)
on conflict (id) do update set public = excluded.public;

-- Public read (site loads images by URL; uploads go through your API with service role only)
drop policy if exists "Public read barber avatars" on storage.objects;
create policy "Public read barber avatars"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'barber-avatars');
