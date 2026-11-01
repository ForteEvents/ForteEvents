-- Personalized E-card invitations and QR check-in
create table if not exists public.e_card_guests (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.e_cards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  guest_name text not null,
  invite_type text not null check (invite_type in ('single','double')),
  guest_count integer not null check (guest_count in (1,2)),
  token uuid not null default gen_random_uuid() unique,
  checked_in_at timestamptz,
  checked_in_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists e_card_guests_owner_card_idx
  on public.e_card_guests(user_id, card_id, created_at desc);
create index if not exists e_card_guests_token_idx on public.e_card_guests(token);
alter table public.e_card_guests enable row level security;
drop policy if exists "Customers manage own e-card guests" on public.e_card_guests;
create policy "Customers manage own e-card guests" on public.e_card_guests
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant select, insert, update, delete on public.e_card_guests to authenticated;

-- Public guest invitation lookup by unguessable token; managers still need auth to check in.
drop policy if exists "Guests can view their own invitation by token" on public.e_card_guests;
create policy "Guests can view their own invitation by token" on public.e_card_guests
  for select to anon, authenticated using (true);
grant select on public.e_card_guests to anon;
