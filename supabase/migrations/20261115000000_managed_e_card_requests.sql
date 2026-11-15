create table if not exists public.e_card_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_name text not null,
  customer_phone text not null,
  event_details jsonb not null default '{}'::jsonb,
  guest_list jsonb not null default '[]'::jsonb,
  status text not null default 'submitted'
    check (status in ('submitted','reviewing','designing','ready','dispatched','completed','rejected')),
  admin_notes text,
  assigned_admin uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists e_card_requests_user_created_idx
  on public.e_card_requests (user_id, created_at desc);
create index if not exists e_card_requests_status_created_idx
  on public.e_card_requests (status, created_at desc);

alter table public.e_card_requests enable row level security;

drop policy if exists "Customers create own E-card requests" on public.e_card_requests;
create policy "Customers create own E-card requests"
  on public.e_card_requests for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Customers view own E-card requests" on public.e_card_requests;
create policy "Customers view own E-card requests"
  on public.e_card_requests for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Admins view all E-card requests" on public.e_card_requests;
create policy "Admins view all E-card requests"
  on public.e_card_requests for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ));

drop policy if exists "Admins update E-card requests" on public.e_card_requests;
create policy "Admins update E-card requests"
  on public.e_card_requests for update to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  ));

grant select, insert on public.e_card_requests to authenticated;
grant update on public.e_card_requests to authenticated;
