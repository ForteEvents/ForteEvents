-- Do not expose bearer QR tokens in the usher attendance report.
drop function if exists public.get_e_card_checkin_guests(uuid);

create or replace function public.get_e_card_checkin_guests(p_card_id uuid)
returns table (
  guest_id uuid, guest_name text, invite_type text, guest_count integer,
  checked_in_at timestamptz, checked_in_by uuid
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
  select g.id,g.guest_name,g.invite_type,g.guest_count,g.checked_in_at,g.checked_in_by
  from public.e_card_guests g
  where g.card_id=p_card_id
  order by g.created_at desc;
end;
$$;
revoke all on function public.get_e_card_checkin_guests(uuid) from public, anon;
grant execute on function public.get_e_card_checkin_guests(uuid) to authenticated;
