-- ForteEvents: event-specific QR check-in staff permissions
-- Keeps each guest token bound to one e-card/event and grants ushers only scoped access.

create table if not exists public.e_card_checkin_staff (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.e_cards(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  staff_user_id uuid not null references auth.users(id) on delete cascade,
  staff_name text not null default '',
  staff_phone text not null default '',
  created_at timestamptz not null default now(),
  unique (card_id, staff_user_id),
  check (owner_user_id <> staff_user_id)
);

create index if not exists e_card_checkin_staff_staff_idx
  on public.e_card_checkin_staff(staff_user_id, card_id);
create index if not exists e_card_checkin_staff_owner_idx
  on public.e_card_checkin_staff(owner_user_id, card_id);

alter table public.e_card_checkin_staff enable row level security;
revoke all on table public.e_card_checkin_staff from anon, authenticated;
grant select on table public.e_card_checkin_staff to authenticated;

drop policy if exists "Event owners and assigned ushers can view check-in assignments" on public.e_card_checkin_staff;
create policy "Event owners and assigned ushers can view check-in assignments"
on public.e_card_checkin_staff for select to authenticated
using ((select auth.uid()) = owner_user_id or (select auth.uid()) = staff_user_id);

create or replace function public.add_e_card_checkin_staff(
  p_card_id uuid,
  p_staff_email text,
  p_staff_name text default '',
  p_staff_phone text default ''
)
returns table (assignment_id uuid, staff_user_id uuid, staff_name text, staff_email text, staff_phone text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid := auth.uid();
  v_staff_id uuid;
  v_name text;
  v_email text;
begin
  if v_owner is null then raise exception 'Tafadhali ingia kwanza.'; end if;
  if not exists (select 1 from public.e_cards c where c.id=p_card_id and c.user_id=v_owner) then
    raise exception 'Huna ruhusa ya kusimamia tukio hili.';
  end if;
  select p.id, coalesce(nullif(trim(p.full_name),''),trim(p_staff_name)), p.email
    into v_staff_id, v_name, v_email
  from public.profiles p
  where lower(trim(p.email))=lower(trim(p_staff_email))
    and p.id <> v_owner
  limit 1;
  if v_staff_id is null then
    raise exception 'Akaunti ya usher haijapatikana. Msaidizi anatakiwa kuwa na akaunti ya ForteEvents kwa barua pepe hiyo.';
  end if;
  insert into public.e_card_checkin_staff(card_id,owner_user_id,staff_user_id,staff_name,staff_phone)
  values (p_card_id,v_owner,v_staff_id,coalesce(v_name,''),coalesce(trim(p_staff_phone),''))
  on conflict (card_id,staff_user_id) do update
    set staff_name=excluded.staff_name, staff_phone=excluded.staff_phone
  returning id, public.e_card_checkin_staff.staff_user_id,
    public.e_card_checkin_staff.staff_name, v_email, public.e_card_checkin_staff.staff_phone
  into assignment_id, staff_user_id, staff_name, staff_email, staff_phone;
  return next;
end;
$$;

create or replace function public.remove_e_card_checkin_staff(p_assignment_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_owner uuid := auth.uid(); v_count integer;
begin
  if v_owner is null then raise exception 'Tafadhali ingia kwanza.'; end if;
  delete from public.e_card_checkin_staff
  where id=p_assignment_id and owner_user_id=v_owner;
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

create or replace function public.get_e_card_checkin_cards()
returns table (
  card_id uuid, title text, event_date date, venue text,
  owner_user_id uuid, access_role text
)
language plpgsql
security definer
set search_path = ''
as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Tafadhali ingia kwanza.'; end if;
  return query
  select c.id,c.title,c.event_date,c.venue,c.user_id,
    case when c.user_id=v_user then 'owner' else 'usher' end
  from public.e_cards c
  where c.user_id=v_user
     or exists(select 1 from public.e_card_checkin_staff s
               where s.card_id=c.id and s.staff_user_id=v_user)
  order by c.event_date desc nulls last, c.created_at desc;
end;
$$;

create or replace function public.get_e_card_checkin_guests(p_card_id uuid)
returns table (
  guest_id uuid, guest_name text, invite_type text, guest_count integer,
  checked_in_at timestamptz, checked_in_by uuid, token uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Tafadhali ingia kwanza.'; end if;
  if not exists (
    select 1 from public.e_cards c where c.id=p_card_id and c.user_id=v_user
    union all
    select 1 from public.e_card_checkin_staff s where s.card_id=p_card_id and s.staff_user_id=v_user
  ) then raise exception 'Huna ruhusa ya kuona wageni wa tukio hili.'; end if;
  return query
  select g.id,g.guest_name,g.invite_type,g.guest_count,g.checked_in_at,g.checked_in_by,g.token
  from public.e_card_guests g
  where g.card_id=p_card_id
  order by g.created_at desc;
end;
$$;

create or replace function public.check_in_e_card_guest(p_token uuid)
returns table (
  guest_id uuid, guest_name text, invite_type text, guest_count integer,
  checked_in_at timestamptz, already_checked_in boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_guest public.e_card_guests%rowtype;
begin
  if v_user is null then raise exception 'Tafadhali ingia kwanza.'; end if;
  select g.* into v_guest
  from public.e_card_guests g
  where g.token=p_token
    and (
      g.user_id=v_user
      or exists(select 1 from public.e_card_checkin_staff s
                where s.card_id=g.card_id and s.staff_user_id=v_user)
    )
  for update;
  if not found then raise exception 'QR si sahihi au huna ruhusa ya tukio hili.'; end if;
  if v_guest.checked_in_at is not null then
    return query select v_guest.id,v_guest.guest_name,v_guest.invite_type,
      v_guest.guest_count,v_guest.checked_in_at,true;
    return;
  end if;
  update public.e_card_guests g
    set checked_in_at=now(), checked_in_by=v_user
    where g.id=v_guest.id
    returning g.* into v_guest;
  return query select v_guest.id,v_guest.guest_name,v_guest.invite_type,
    v_guest.guest_count,v_guest.checked_in_at,false;
end;
$$;

revoke all on function public.add_e_card_checkin_staff(uuid,text,text,text) from public, anon;
revoke all on function public.remove_e_card_checkin_staff(uuid) from public, anon;
revoke all on function public.get_e_card_checkin_cards() from public, anon;
revoke all on function public.get_e_card_checkin_guests(uuid) from public, anon;
revoke all on function public.check_in_e_card_guest(uuid) from public, anon;
grant execute on function public.add_e_card_checkin_staff(uuid,text,text,text) to authenticated;
grant execute on function public.remove_e_card_checkin_staff(uuid) to authenticated;
grant execute on function public.get_e_card_checkin_cards() to authenticated;
grant execute on function public.get_e_card_checkin_guests(uuid) to authenticated;
grant execute on function public.check_in_e_card_guest(uuid) to authenticated;
