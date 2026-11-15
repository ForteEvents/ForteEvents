-- Restrict browser-facing privileges for profile and managed E-card request data.
-- Profile creation is handled by the existing auth.users trigger (handle_new_user),
-- and balance/role changes are handled by trusted server-side admin operations.

revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;

-- Customers may submit a request and admins may review/update its workflow.
-- Do not expose DELETE or unrestricted table-level writes to browser sessions.
revoke all on table public.e_card_requests from public, anon, authenticated;
grant select on table public.e_card_requests to authenticated;
grant insert (user_id, customer_name, customer_phone, event_details, guest_list)
  on table public.e_card_requests to authenticated;
grant update (status, updated_at)
  on table public.e_card_requests to authenticated;

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
