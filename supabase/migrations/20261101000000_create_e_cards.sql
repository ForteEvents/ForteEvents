-- ForteEvents digital invitation cards
create table if not exists public.e_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique,
  title text not null,
  occasion text not null default 'Harusi',
  host_names text not null default '',
  event_date date not null,
  event_time time,
  venue text not null default '',
  message text not null default '',
  image_url text,
  theme text not null default 'gold' check (theme in ('gold', 'classic')),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists e_cards_user_created_idx
  on public.e_cards (user_id, created_at desc);
create index if not exists e_cards_public_slug_idx
  on public.e_cards (slug) where is_published = true;

alter table public.e_cards enable row level security;

drop policy if exists "Customers manage own e-cards" on public.e_cards;
create policy "Customers manage own e-cards"
  on public.e_cards for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Anyone can view published e-cards" on public.e_cards;
create policy "Anyone can view published e-cards"
  on public.e_cards for select to anon, authenticated
  using (is_published = true);

grant select, insert, update, delete on public.e_cards to authenticated;
grant select on public.e_cards to anon;
