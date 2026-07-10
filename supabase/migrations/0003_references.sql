-- Migration 0003 — typed, multi-file references
-- Replaces the single manual_path/manual_filename columns on items with an
-- item_references table: each item can now have any number of reference
-- files (manual, parts list, receipt, warranty…) of any type (PDF, images,
-- video). Existing attached manuals are preserved as 'Manual' references.
--
-- Run in the Supabase SQL editor (Dashboard → SQL Editor → New query).
-- Safe to re-run.

create table if not exists item_references (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade default auth.uid(),
  item_id       uuid not null references items(id) on delete cascade,
  kind          text not null default 'Other',   -- Manual, Parts list, Receipt, Warranty, Other
  filename      text not null,
  storage_path  text not null,                   -- path within the item-manuals bucket
  mime_type     text not null default '',
  created_at    timestamptz not null default now()
);

create index if not exists item_references_item_id_idx on item_references(item_id);

alter table item_references enable row level security;

drop policy if exists "item_references_owner_all" on item_references;
create policy "item_references_owner_all" on item_references
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Preserve any already-attached manuals as 'Manual' references.
insert into item_references (user_id, item_id, kind, filename, storage_path, mime_type)
select user_id, id, 'Manual', coalesce(manual_filename, 'manual.pdf'), manual_path, 'application/pdf'
from items
where manual_path is not null
  and not exists (
    select 1 from item_references r
    where r.item_id = items.id and r.storage_path = items.manual_path
  );

alter table items drop column if exists manual_path;
alter table items drop column if exists manual_filename;

-- The existing item-manuals bucket now holds all reference files, not just
-- PDFs. Its policies (public read, owner-only write) don't restrict content
-- type, so no storage changes are needed.
