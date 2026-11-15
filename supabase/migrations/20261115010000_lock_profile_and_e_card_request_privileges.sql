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
