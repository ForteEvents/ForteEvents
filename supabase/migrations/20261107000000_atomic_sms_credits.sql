-- Atomic SMS credit operations.
-- These functions are called only by the trusted backend service role.
create or replace function public.reserve_sms_credits(
  p_user_id uuid,
  p_amount integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_user_id is null or p_amount is null or p_amount <= 0 then
    raise exception 'Invalid SMS credit reservation.';
  end if;

  update public.profiles
  set sms_balance = coalesce(sms_balance, 0) - p_amount,
      updated_at = now()
  where id = p_user_id
    and coalesce(sms_balance, 0) >= p_amount
  returning sms_balance into v_balance;

  return v_balance;
end;
$$;

create or replace function public.adjust_sms_credits(
  p_user_id uuid,
  p_amount integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  if p_user_id is null or p_amount is null or p_amount = 0 then
    raise exception 'Invalid SMS credit adjustment.';
  end if;

  update public.profiles
  set sms_balance = coalesce(sms_balance, 0) + p_amount,
      updated_at = now()
  where id = p_user_id
    and coalesce(sms_balance, 0) + p_amount >= 0
  returning sms_balance into v_balance;

  if v_balance is null then
    raise exception 'Customer profile not found or SMS balance would become negative.';
  end if;

  return v_balance;
end;
$$;

revoke all on function public.reserve_sms_credits(uuid, integer) from public, anon, authenticated;
revoke all on function public.adjust_sms_credits(uuid, integer) from public, anon, authenticated;
grant execute on function public.reserve_sms_credits(uuid, integer) to service_role;
grant execute on function public.adjust_sms_credits(uuid, integer) to service_role;
