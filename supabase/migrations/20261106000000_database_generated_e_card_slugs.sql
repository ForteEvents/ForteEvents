-- Generate public E-card slugs in PostgreSQL instead of the browser.
-- Existing slugs are preserved; the default applies to new rows only.
alter table public.e_cards
  alter column slug set default ('card-' || gen_random_uuid()::text);
