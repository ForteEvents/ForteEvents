-- Store each invitee's WhatsApp destination alongside the guest-specific QR.
alter table public.e_card_guests
  add column if not exists whatsapp_phone text;

do $constraint$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.e_card_guests'::regclass
      and conname = 'e_card_guests_whatsapp_phone_format'
  ) then
    alter table public.e_card_guests
      add constraint e_card_guests_whatsapp_phone_format
      check (whatsapp_phone is null or whatsapp_phone ~ '^[1-9][0-9]{9,14}$');
  end if;
end;
$constraint$;

comment on column public.e_card_guests.whatsapp_phone is
  'Normalized international WhatsApp number in digits-only format; optional only for legacy invitations.';

create or replace function public.admin_fulfill_e_card_request(
  p_request_id uuid,
  p_template_id text,
  p_template_snapshot jsonb
)
returns table(card_id uuid, card_slug text, guest_count integer)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_admin uuid := auth.uid();
  v_request public.e_card_requests%rowtype;
  v_card public.e_cards%rowtype;
  v_config jsonb;
  v_guest jsonb;
  v_guest_id uuid;
  v_balance integer;
  v_total integer;
  v_count integer;
begin
  if v_admin is null or not exists (
    select 1 from public.profiles p where p.id = v_admin and p.role = 'admin'
  ) then
    raise exception 'Huna ruhusa ya kutengeneza E-card.';
  end if;

  if coalesce(p_template_id,'') = '' or coalesce(p_template_snapshot->>'id','') <> p_template_id then
    raise exception 'Kiolezo kilichochaguliwa si sahihi.';
  end if;

  select s.config into v_config
  from public.e_card_template_settings s
  where s.template_id = p_template_id and s.is_published = true
  limit 1;
  if v_config is null then
    raise exception 'Kiolezo hiki hakijachapishwa au hakipo.';
  end if;

  select r.* into v_request
  from public.e_card_requests r
  where r.id = p_request_id
  for update;
  if not found then raise exception 'Ombi halijapatikana.'; end if;
  if v_request.generated_card_id is not null then
    raise exception 'Kadi ya ombi hili tayari imetengenezwa.';
  end if;
  if v_request.status = 'rejected' then
    raise exception 'Ombi lililokataliwa haliwezi kutengenezewa kadi.';
  end if;

  if jsonb_typeof(v_request.guest_list) is distinct from 'array' then
    raise exception 'Orodha ya wageni si sahihi.';
  end if;
  v_count := jsonb_array_length(v_request.guest_list);
  if v_count < 1 or v_count > 5000 then
    raise exception 'Orodha lazima iwe na wageni 1 hadi 5000.';
  end if;

  for v_guest in select value from jsonb_array_elements(v_request.guest_list)
  loop
    if length(trim(coalesce(v_guest->>'guest_name',''))) not between 1 and 120
       or coalesce(v_guest->>'invite_type','') not in ('single','double')
       or coalesce(v_guest->>'whatsapp_phone','') !~ '^[1-9][0-9]{9,14}$' then
      raise exception 'Kuna jina, namba ya WhatsApp au aina ya mwaliko isiyo sahihi kwenye orodha.';
    end if;
  end loop;

  v_total := v_count * 500;
  insert into public.e_card_wallets(user_id) values (v_request.user_id)
  on conflict (user_id) do nothing;

  update public.e_card_wallets
    set balance = balance - v_total, updated_at = now()
    where user_id = v_request.user_id and balance >= v_total
    returning balance into v_balance;
  if v_balance is null then
    raise exception 'Salio la mteja halitoshi. Anahitaji TSh % kwa wageni %.', v_total, v_count;
  end if;

  insert into public.e_cards (
    user_id, source_request_id, title, occasion, host_names, bride_name, groom_name,
    event_date, event_time, venue, message, image_url, theme, is_published,
    location_url, design, ceremony_time, ceremony_venue, reception_time,
    reception_venue, food_note, dress_code, dress_colors, rsvp_deadline,
    rsvp_contact_name, rsvp_contact_phone, rsvp_contact_name_2, rsvp_contact_phone_2
  ) values (
    v_request.user_id, v_request.id,
    coalesce(nullif(trim(v_request.event_details->>'title'),''),'Tukio la ForteEvents'),
    coalesce(nullif(v_request.event_details->>'occasion',''),'Harusi'),
    coalesce(v_request.event_details->>'host_names',''),
    coalesce(v_request.event_details->>'bride_name',''),
    coalesce(v_request.event_details->>'groom_name',''),
    nullif(v_request.event_details->>'event_date','')::date,
    nullif(v_request.event_details->>'event_time','')::time,
    coalesce(v_request.event_details->>'venue',''),
    coalesce(v_request.event_details->>'message',''),
    nullif(v_request.event_details->>'image_url',''),
    'gold', true,
    nullif(v_request.event_details->>'location_url',''),
    jsonb_build_object(
      'templateId', p_template_id,
      'templateConfig', v_config,
      'templateSnapshot', p_template_snapshot
    ),
    nullif(v_request.event_details->>'ceremony_time','')::time,
    coalesce(v_request.event_details->>'ceremony_venue',''),
    nullif(v_request.event_details->>'reception_time','')::time,
    coalesce(v_request.event_details->>'reception_venue',''),
    coalesce(v_request.event_details->>'food_note',''),
    coalesce(v_request.event_details->>'dress_code',''),
    case when jsonb_typeof(v_request.event_details->'dress_colors')='array'
      then array(select jsonb_array_elements_text(v_request.event_details->'dress_colors'))
      else '{}'::text[] end,
    nullif(v_request.event_details->>'rsvp_deadline','')::date,
    coalesce(v_request.event_details->>'rsvp_contact_name',''),
    coalesce(v_request.event_details->>'rsvp_contact_phone',''),
    coalesce(v_request.event_details->>'rsvp_contact_name_2',''),
    coalesce(v_request.event_details->>'rsvp_contact_phone_2','')
  ) returning * into v_card;

  for v_guest in select value from jsonb_array_elements(v_request.guest_list)
  loop
    insert into public.e_card_guests(card_id,user_id,guest_name,whatsapp_phone,invite_type,guest_count)
    values (
      v_card.id, v_request.user_id, trim(v_guest->>'guest_name'),
      v_guest->>'whatsapp_phone', v_guest->>'invite_type',
      case when v_guest->>'invite_type'='double' then 2 else 1 end
    ) returning id into v_guest_id;

    insert into public.e_card_wallet_transactions(user_id,amount,transaction_type,description,guest_id)
    values (
      v_request.user_id, -500, 'invitation_charge',
      'Malipo ya mwaliko wa ' || trim(v_guest->>'guest_name'), v_guest_id
    );
  end loop;

  update public.e_card_requests
    set generated_card_id = v_card.id,
        status = 'ready',
        assigned_admin = v_admin,
        updated_at = now()
    where id = v_request.id;

  return query select v_card.id, v_card.slug, v_count;
end;
$function$;

revoke all on function public.admin_fulfill_e_card_request(uuid,text,jsonb) from public, anon;
grant execute on function public.admin_fulfill_e_card_request(uuid,text,jsonb) to authenticated;

-- Replace the QR listing function to expose guest WhatsApp numbers only to admins.
drop function if exists public.admin_get_e_card_guest_qr(uuid,integer,integer);

create function public.admin_get_e_card_guest_qr(
  p_card_id uuid,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table(guest_name text, invite_type text, guest_count integer, token uuid, card_slug text, whatsapp_phone text)
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
  select g.guest_name, g.invite_type, g.guest_count, g.token, c.slug, g.whatsapp_phone
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
