-- Track SMS and WhatsApp delivery independently for each E-card guest.
alter table public.e_card_guests
  add column if not exists sms_delivery_status text not null default 'pending',
  add column if not exists whatsapp_delivery_status text not null default 'pending',
  add column if not exists sms_delivery_error text,
  add column if not exists whatsapp_delivery_error text,
  add column if not exists sms_beem_message_id text,
  add column if not exists whatsapp_message_id text,
  add column if not exists sms_sent_at timestamptz,
  add column if not exists whatsapp_sent_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.e_card_guests'::regclass and conname='e_card_guests_sms_delivery_status_check') then
    alter table public.e_card_guests add constraint e_card_guests_sms_delivery_status_check
      check (sms_delivery_status in ('pending','sending','sent','failed'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.e_card_guests'::regclass and conname='e_card_guests_whatsapp_delivery_status_check') then
    alter table public.e_card_guests add constraint e_card_guests_whatsapp_delivery_status_check
      check (whatsapp_delivery_status in ('pending','sending','sent','delivered','read','failed'));
  end if;
end $$;

comment on column public.e_card_guests.sms_delivery_status is 'Per-guest SMS distribution state; updated only by the admin backend.';
comment on column public.e_card_guests.whatsapp_delivery_status is 'Per-guest WhatsApp distribution state; updated only by the admin backend.';

drop function if exists public.admin_get_e_card_guest_qr(uuid,integer,integer);
create function public.admin_get_e_card_guest_qr(
  p_card_id uuid,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table(
  guest_name text, invite_type text, guest_count integer, token uuid,
  card_slug text, whatsapp_phone text,
  sms_delivery_status text, whatsapp_delivery_status text,
  sms_delivery_error text, whatsapp_delivery_error text
)
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  ) then
    raise exception 'Huna ruhusa ya kuona QR za wageni.';
  end if;

  return query
  select g.guest_name, g.invite_type, g.guest_count, g.token, c.slug, g.whatsapp_phone,
         g.sms_delivery_status, g.whatsapp_delivery_status,
         g.sms_delivery_error, g.whatsapp_delivery_error
  from public.e_card_guests g
  join public.e_cards c on c.id = g.card_id
  where c.id = p_card_id
  order by g.created_at, g.guest_name
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$function$;

revoke all on function public.admin_get_e_card_guest_qr(uuid,integer,integer) from public, anon;
grant execute on function public.admin_get_e_card_guest_qr(uuid,integer,integer) to authenticated;
