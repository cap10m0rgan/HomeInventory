-- Upgrades an existing Home Base database (from the original schema.sql) to
-- support multiple photos per item and separate Make/Serial Number fields.
-- Run this in the Supabase SQL editor. Safe to re-run.

-- New fields on items.
alter table items add column if not exists make text default '';
alter table items add column if not exists serial_number text default '';

-- New table for multiple photos per item.
create table if not exists item_photos (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  item_id       uuid not null references items(id) on delete cascade,
  storage_path  text not null,
  is_primary    boolean not null default false,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists item_photos_item_id_idx on item_photos(item_id);

create unique index if not exists item_photos_one_primary_idx
  on item_photos(item_id) where is_primary;

alter table item_photos enable row level security;

drop policy if exists "item_photos_owner_all" on item_photos;
create policy "item_photos_owner_all" on item_photos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Backfill: move any existing single photo_path into item_photos as the
-- primary photo, then drop the old column.
insert into item_photos (user_id, item_id, storage_path, is_primary)
select user_id, id, photo_path, true
from items
where photo_path is not null
on conflict do nothing;

alter table items drop column if exists photo_path;
