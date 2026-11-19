-- Additive Beem delivery tracking fields.
-- Existing SMS history rows are intentionally left unchanged.
alter table public.sms_history
  add column if not exists beem_request_id text,
  add column if not exists beem_status text,
  add column if not exists beem_status_checked_at timestamptz,
  add column if not exists forteevents_message_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.sms_history'::regclass
      and conname = 'sms_history_beem_status_check'
  ) then
    alter table public.sms_history
      add constraint sms_history_beem_status_check
      check (
        beem_status is null
        or beem_status in ('PENDING', 'DELIVERED', 'UNDELIVERED')
      );
  end if;
end
$$;

create index if not exists sms_history_beem_delivery_poll_idx
  on public.sms_history (sent_at asc)
  where status = 'sent'
    and beem_request_id is not null
    and (beem_status is null or beem_status = 'PENDING');

create unique index if not exists sms_history_forteevents_message_id_uidx
  on public.sms_history (forteevents_message_id)
  where forteevents_message_id is not null;

comment on column public.sms_history.beem_request_id is
  'Exact request_id returned by Beem for this individual recipient send attempt.';
comment on column public.sms_history.beem_status is
  'Last confirmed Beem delivery report status: PENDING, DELIVERED, or UNDELIVERED.';
comment on column public.sms_history.beem_status_checked_at is
  'Timestamp of the last delivery report lookup attempt.';
comment on column public.sms_history.forteevents_message_id is
  'Unique ForteEvents identifier for this individual SMS attempt; not a Beem idempotency key.';
