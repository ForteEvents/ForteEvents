-- ForteEvents E-card wallet, pay-per-invitation and venue directions
alter table public.e_cards
  add column if not exists location_url text;

create table if not exists public.e_card_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.e_card_wallet_transactions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount <> 0),
  transaction_type text not null check (transaction_type in ('topup','invitation_charge','refund','adjustment')),
  description text not null default '',
  guest_id uuid references public.e_card_guests(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists e_card_wallet_transactions_user_created_idx
  on public.e_card_wallet_transactions(user_id, created_at desc);

alter table public.e_card_wallets enable row level security;
alter table public.e_card_wallet_transactions enable row level security;

drop policy if exists "Customers view own E-card wallet" on public.e_card_wallets;
create policy "Customers view own E-card wallet"
  on public.e_card_wallets for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Customers view own E-card wallet transactions" on public.e_card_wallet_transactions;
create policy "Customers view own E-card wallet transactions"
  on public.e_card_wallet_transactions for select to authenticated
  using (auth.uid() = user_id);

grant select on public.e_card_wallets, public.e_card_wallet_transactions to authenticated;

-- Add a wallet automatically for each new customer.
create or replace function public.create_e_card_wallet_for_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.e_card_wallets(user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_e_card_wallet on auth.users;
create trigger on_auth_user_created_e_card_wallet
  after insert on auth.users
  for each row execute procedure public.create_e_card_wallet_for_new_user();

insert into public.e_card_wallets(user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- One personalized invitation costs TZS 500. Charge and guest creation are atomic.
create or replace function public.create_paid_e_card_guest(
  p_card_id uuid,
  p_guest_name text,
  p_invite_type text
)
returns public.e_card_guests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_guest public.e_card_guests;
  v_balance integer;
begin
  if v_user_id is null then
    raise exception 'Tafadhali ingia kwenye akaunti yako.';
  end if;
  if length(trim(coalesce(p_guest_name, ''))) = 0 then
    raise exception 'Jina la mgeni linahitajika.';
  end if;
  if p_invite_type not in ('single','double') then
    raise exception 'Aina ya mwaliko si sahihi.';
  end if;
  if not exists (
    select 1 from public.e_cards
    where id = p_card_id and user_id = v_user_id
  ) then
    raise exception 'E-card hii haipo kwenye akaunti yako.';
  end if;

  insert into public.e_card_wallets(user_id) values (v_user_id)
  on conflict (user_id) do nothing;

  update public.e_card_wallets
    set balance = balance - 500, updated_at = now()
    where user_id = v_user_id and balance >= 500
    returning balance into v_balance;

  if v_balance is null then
    raise exception 'Salio la E-card halitoshi. Unahitaji TSh 500 kwa mwaliko mmoja.';
  end if;

  insert into public.e_card_guests(
    card_id, user_id, guest_name, invite_type, guest_count
  ) values (
    p_card_id, v_user_id, trim(p_guest_name), p_invite_type,
    case when p_invite_type = 'double' then 2 else 1 end
  ) returning * into v_guest;

  insert into public.e_card_wallet_transactions(
    user_id, amount, transaction_type, description, guest_id
  ) values (
    v_user_id, -500, 'invitation_charge',
    'Malipo ya mwaliko wa ' || trim(p_guest_name), v_guest.id
  );

  return v_guest;
end;
$$;

-- Admin-only wallet top-up. Customer IDs and amounts are checked server-side.
create or replace function public.admin_adjust_e_card_balance(
  p_user_id uuid,
  p_amount integer,
  p_description text default 'Admin E-card wallet top-up'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) then
    raise exception 'Huna ruhusa ya kuongeza salio.';
  end if;
  if p_user_id is null or p_amount <= 0 then
    raise exception 'Mteja na kiasi cha kuongeza vinahitajika.';
  end if;

  insert into public.e_card_wallets(user_id) values (p_user_id)
  on conflict (user_id) do nothing;

  update public.e_card_wallets
    set balance = balance + p_amount, updated_at = now()
    where user_id = p_user_id
    returning balance into v_balance;

  insert into public.e_card_wallet_transactions(
    user_id, amount, transaction_type, description
  ) values (
    p_user_id, p_amount, 'topup', coalesce(p_description, 'Admin E-card wallet top-up')
  );

  return v_balance;
end;
$$;

revoke all on function public.create_paid_e_card_guest(uuid,text,text) from public;
grant execute on function public.create_paid_e_card_guest(uuid,text,text) to authenticated;
revoke all on function public.admin_adjust_e_card_balance(uuid,integer,text) from public;
grant execute on function public.admin_adjust_e_card_balance(uuid,integer,text) to authenticated;
