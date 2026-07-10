-- Migration 0004 — reference kind becomes free text
-- The kind column was always text; this just adds the server-side length
-- guard now that the UI accepts arbitrary labels instead of a fixed list.
--
-- Run in the Supabase SQL editor. Safe to re-run.

alter table item_references drop constraint if exists item_references_kind_length;
alter table item_references add constraint item_references_kind_length
  check (char_length(kind) between 1 and 40);
