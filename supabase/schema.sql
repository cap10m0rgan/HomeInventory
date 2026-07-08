-- Home Base — Supabase schema
-- Run this once in the Supabase project's SQL editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: guarded with IF NOT EXISTS / OR REPLACE where possible.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists spaces (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name        text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists items (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade default auth.uid(),
  space_id          uuid not null references spaces(id) on delete cascade,
  name              text not null,
  model             text default '',
  notes             text default '',
  photo_path        text,               -- storage path within the item-photos bucket
  manual_path       text,               -- storage path within the item-manuals bucket
  manual_filename   text,
  created_at        timestamptz not null default now()
);

create table if not exists parts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade default auth.uid(),
  item_id     uuid not null references items(id) on delete cascade,
  type        text not null default 'Other',
  name        text not null,
  link        text default '',
  notes       text default '',
  created_at  timestamptz not null default now()
);

create index if not exists items_space_id_idx on items(space_id);
create index if not exists parts_item_id_idx on parts(item_id);

-- ---------------------------------------------------------------------------
-- Row Level Security — every row is only visible/writable by the user who
-- owns it. Since this is a single-user app, in practice that means "only you
-- once you're signed in."
-- ---------------------------------------------------------------------------
alter table spaces enable row level security;
alter table items  enable row level security;
alter table parts  enable row level security;

drop policy if exists "spaces_owner_all" on spaces;
create policy "spaces_owner_all" on spaces
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "items_owner_all" on items;
create policy "items_owner_all" on items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "parts_owner_all" on parts;
create policy "parts_owner_all" on parts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage buckets for item photos and manual PDFs.
-- Buckets are "public" (readable by anyone with the exact URL) so <img> tags
-- and manual links work without signed-URL refresh logic — object keys are
-- random UUIDs and the bucket is not browsable, so this is "unlisted," not
-- indexed. Writes are still restricted to the authenticated owner below.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('item-photos', 'item-photos', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('item-manuals', 'item-manuals', true)
  on conflict (id) do nothing;

drop policy if exists "item_photos_public_read" on storage.objects;
create policy "item_photos_public_read" on storage.objects
  for select using (bucket_id = 'item-photos');

drop policy if exists "item_photos_owner_write" on storage.objects;
create policy "item_photos_owner_write" on storage.objects
  for insert with check (bucket_id = 'item-photos' and auth.uid() = owner);

drop policy if exists "item_photos_owner_update" on storage.objects;
create policy "item_photos_owner_update" on storage.objects
  for update using (bucket_id = 'item-photos' and auth.uid() = owner);

drop policy if exists "item_photos_owner_delete" on storage.objects;
create policy "item_photos_owner_delete" on storage.objects
  for delete using (bucket_id = 'item-photos' and auth.uid() = owner);

drop policy if exists "item_manuals_public_read" on storage.objects;
create policy "item_manuals_public_read" on storage.objects
  for select using (bucket_id = 'item-manuals');

drop policy if exists "item_manuals_owner_write" on storage.objects;
create policy "item_manuals_owner_write" on storage.objects
  for insert with check (bucket_id = 'item-manuals' and auth.uid() = owner);

drop policy if exists "item_manuals_owner_update" on storage.objects;
create policy "item_manuals_owner_update" on storage.objects
  for update using (bucket_id = 'item-manuals' and auth.uid() = owner);

drop policy if exists "item_manuals_owner_delete" on storage.objects;
create policy "item_manuals_owner_delete" on storage.objects
  for delete using (bucket_id = 'item-manuals' and auth.uid() = owner);
