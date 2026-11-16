-- Guest WhatsApp numbers are private operational data for the ForteEvents team.
-- Keep legacy guest reads working without exposing the new destination column
-- through direct browser table queries. Admins retrieve it via the guarded RPC.
revoke select on table public.e_card_guests from public, anon, authenticated;
grant select (
  id, card_id, user_id, guest_name, invite_type, guest_count,
  token, checked_in_at, checked_in_by, created_at
) on table public.e_card_guests to authenticated;
