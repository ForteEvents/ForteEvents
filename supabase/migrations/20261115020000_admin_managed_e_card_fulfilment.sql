-- Move E-card production to an admin-controlled workflow.
-- Customers can view their own cards/guest lists, but cannot create or alter them directly.
alter table public.e_cards
  add column if not exists source_request_id uuid references public.e_card_requests(id) on delete set null;
create unique index if not exists e_cards_source_request_id_uidx
  on public.e_cards(source_request_id) where source_request_id is not null;

alter table public.e_card_requests
  add column if not exists generated_card_id uuid references public.e_cards(id) on delete set null;

-- Bound request payloads at the database boundary as well as in the browser form.
do $constraints$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.e_card_requests'::regclass
      and conname = 'e_card_requests_payload_limits'
  ) then
    alter table public.e_card_requests
      add constraint e_card_requests_payload_limits check (
        length(trim(customer_name)) between 1 and 100
        and length(trim(customer_phone)) between 5 and 25
        and jsonb_typeof(event_details) = 'object'
        and octet_length(event_details::text) <= 20000
        and jsonb_typeof(guest_list) = 'array'
        and jsonb_array_length(guest_list) between 1 and 5000
        and octet_length(guest_list::text) <= 300000
      );
  end if;
end;
$constraints$;

drop policy if exists "Customers manage own e-cards" on public.e_cards;
drop policy if exists "Customers view own e-cards" on public.e_cards;
create policy "Customers view own e-cards"
  on public.e_cards for select to authenticated
  using (auth.uid() = user_id);

-- Public invitation pages must still be able to load published card artwork/details.
drop policy if exists "Anyone can view published e-cards" on public.e_cards;
create policy "Anyone can view published e-cards"
  on public.e_cards for select to anon, authenticated
  using (is_published = true);

drop policy if exists "Customers manage own e-card guests" on public.e_card_guests;
drop policy if exists "Customers view own e-card guests" on public.e_card_guests;
create policy "Customers view own e-card guests"
  on public.e_card_guests for select to authenticated
  using (auth.uid() = user_id);

revoke all on table public.e_cards from public, anon, authenticated;
grant select on table public.e_cards to anon, authenticated;

revoke all on table public.e_card_guests from public, anon, authenticated;
grant select on table public.e_card_guests to authenticated;

-- Only a signed-in ForteEvents admin can fulfil a customer request.
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
       or coalesce(v_guest->>'invite_type','') not in ('single','double') then
      raise exception 'Kuna jina au aina ya mwaliko isiyo sahihi kwenye orodha.';
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
    insert into public.e_card_guests(card_id,user_id,guest_name,invite_type,guest_count)
    values (
      v_card.id, v_request.user_id, trim(v_guest->>'guest_name'),
      v_guest->>'invite_type',
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

-- A public invitation link can reveal only the named guest for the matching secret token.
create or replace function public.get_public_e_card_guest(p_card_id uuid, p_token uuid)
returns table(guest_name text, invite_type text, guest_count integer, token uuid)
language sql
security definer
set search_path = ''
as $function$
  select g.guest_name, g.invite_type, g.guest_count, g.token
  from public.e_card_guests g
  join public.e_cards c on c.id = g.card_id
  where g.card_id = p_card_id
    and g.token = p_token
    and c.is_published = true;
$function$;

revoke all on function public.get_public_e_card_guest(uuid,uuid) from public;
grant execute on function public.get_public_e_card_guest(uuid,uuid) to anon, authenticated;

-- Trigger functions are invoked by their database triggers, not by browser RPC.
-- They must not be callable directly through the exposed Data API.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.create_e_card_wallet_for_new_user() from public, anon, authenticated;

-- Remove direct customer creation of guests/cards from the legacy E-card builder.
revoke all on function public.create_paid_e_card_guest(uuid,text,text) from public, anon, authenticated;
revoke all on function public.admin_adjust_e_card_balance(uuid,integer,text) from public, anon;
grant execute on function public.admin_adjust_e_card_balance(uuid,integer,text) to authenticated;
revoke all on function public.admin_get_e_card_accounts() from public, anon;
grant execute on function public.admin_get_e_card_accounts() to authenticated;
revoke all on function public.admin_get_e_card_transactions(uuid) from public, anon;
grant execute on function public.admin_get_e_card_transactions(uuid) to authenticated;

-- Return only the guest QR data for admins assigned to the managed fulfilment workflow.
create or replace function public.admin_get_e_card_guest_qr(
  p_card_id uuid,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table(guest_name text, invite_type text, guest_count integer, token uuid, card_slug text)
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
  select g.guest_name, g.invite_type, g.guest_count, g.token, c.slug
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

-- The legacy SMS contact-group rename RPC accepted an arbitrary user_id without
-- checking the caller. Keep the feature for signed-in owners, but prevent cross-account edits.
create or replace function public.rename_sms_contact_group(
  p_user_id uuid,
  p_old_name text,
  p_new_name text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $function$
declare
  changed_count integer := 0;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Huna ruhusa ya kubadilisha makundi ya mteja mwingine.';
  end if;

  if p_old_name is null or trim(p_old_name) = ''
     or p_new_name is null or trim(p_new_name) = '' then
    raise exception 'Jina la kundi haliwezi kuwa tupu.';
  end if;

  if p_old_name = p_new_name then return 0; end if;

  if exists (
    select 1 from public.sms_contact_groups
    where user_id = p_user_id and name = trim(p_new_name)
  ) then
    raise exception 'Kundi lenye jina hilo tayari lipo.';
  end if;

  update public.sms_contacts
  set group_name = trim(p_new_name)
  where user_id = p_user_id
    and coalesce(nullif(trim(group_name), ''), 'Contacts Zangu') = trim(p_old_name);

  get diagnostics changed_count = row_count;

  update public.sms_contact_groups
  set name = trim(p_new_name)
  where user_id = p_user_id and name = trim(p_old_name);

  if not found then
    raise exception 'Kundi halijapatikana.';
  end if;

  return changed_count;
end;
$function$;

revoke all on function public.rename_sms_contact_group(uuid,text,text) from public, anon;
grant execute on function public.rename_sms_contact_group(uuid,text,text) to authenticated;
