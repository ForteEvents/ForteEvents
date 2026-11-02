-- Persist customer-selected E-card visual design settings.
alter table public.e_cards
  add column if not exists design jsonb not null default '{}'::jsonb;

-- Allow authenticated app clients to read/write the new column through the Data API.
grant select, insert, update on table public.e_cards to authenticated;
