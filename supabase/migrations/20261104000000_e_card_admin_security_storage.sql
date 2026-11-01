-- Admin E-card account overview, transaction history, secure check-in and image storage
create or replace function public.admin_get_e_card_accounts()
returns table (
  user_id uuid,
  full_name text,
  email text,
  phone text,
  sms_balance integer,
  e_card_balance integer,
  cards_count bigint,
  invitations_count bigint,
  checked_in_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ) then raise exception 'Huna ruhusa ya kuona akaunti za wateja.'; end if;

  return query
  select p.id, p.full_name, p.email, p.phone, coalesce(p.sms_balance,0),
    coalesce(w.balance,0),
    (select count(*) from public.e_cards c where c.user_id=p.id),
    (select count(*) from public.e_card_guests g where g.user_id=p.id),
    (select count(*) from public.e_card_guests g where g.user_id=p.id and g.checked_in_at is not null)
  from public.profiles p
  left join public.e_card_wallets w on w.user_id=p.id
  where coalesce(p.role,'customer') <> 'admin'
  order by p.created_at desc;
end;
$$;

create or replace function public.admin_get_e_card_transactions(p_user_id uuid)
returns table (
  id bigint, amount integer, transaction_type text, description text,
  created_at timestamptz, guest_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles where id=auth.uid() and role='admin'
  ) then raise exception 'Huna ruhusa.'; end if;
  return query
  select t.id,t.amount,t.transaction_type,t.description,t.created_at,t.guest_id
  from public.e_card_wallet_transactions t
  where t.user_id=p_user_id
  order by t.created_at desc limit 100;
end;
$$;

create or replace function public.check_in_e_card_guest(p_token uuid)
returns table (guest_id uuid, guest_name text, invite_type text, guest_count integer, checked_in_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Tafadhali ingia kwanza.'; end if;
  return query
  update public.e_card_guests g
  set checked_in_at=now(), checked_in_by=auth.uid()
  where g.token=p_token and g.user_id=auth.uid() and g.checked_in_at is null
  returning g.id,g.guest_name,g.invite_type,g.guest_count,g.checked_in_at;
  if not found then
    if exists(select 1 from public.e_card_guests where token=p_token and user_id=auth.uid() and checked_in_at is not null) then
      raise exception 'Mgeni huyu tayari ameingia.';
    end if;
    raise exception 'QR si sahihi au mgeni si wa tukio lako.';
  end if;
end;
$$;

revoke all on function public.admin_get_e_card_accounts() from public;
revoke all on function public.admin_get_e_card_transactions(uuid) from public;
revoke all on function public.check_in_e_card_guest(uuid) from public;
grant execute on function public.admin_get_e_card_accounts() to authenticated;
grant execute on function public.admin_get_e_card_transactions(uuid) to authenticated;
grant execute on function public.check_in_e_card_guest(uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('e-card-images','e-card-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true, file_size_limit=5242880,
  allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "E-card owners upload images" on storage.objects;
create policy "E-card owners upload images" on storage.objects
for insert to authenticated with check (
  bucket_id='e-card-images' and (storage.foldername(name))[1]=auth.uid()::text
);
drop policy if exists "E-card owners update images" on storage.objects;
create policy "E-card owners update images" on storage.objects
for update to authenticated using (
  bucket_id='e-card-images' and (storage.foldername(name))[1]=auth.uid()::text
) with check (
  bucket_id='e-card-images' and (storage.foldername(name))[1]=auth.uid()::text
);
drop policy if exists "E-card owners delete images" on storage.objects;
create policy "E-card owners delete images" on storage.objects
for delete to authenticated using (
  bucket_id='e-card-images' and (storage.foldername(name))[1]=auth.uid()::text
);
