-- Admin SMS management: preserve every resend as a separate SMS attempt.
alter table public.sms_history
  add column if not exists resend_of_id uuid references public.sms_history(id) on delete set null,
  add column if not exists resend_by uuid references public.profiles(id) on delete set null;

create unique index if not exists sms_history_one_resend_per_attempt
  on public.sms_history (resend_of_id)
  where resend_of_id is not null;

create index if not exists sms_history_admin_status_sent_at
  on public.sms_history (status, sent_at desc);

create index if not exists sms_history_resend_by_idx
  on public.sms_history (resend_by)
  where resend_by is not null;

comment on column public.sms_history.resend_of_id is
  'Original SMS attempt that this Admin-initiated resend follows.';
comment on column public.sms_history.resend_by is
  'Admin profile ID that initiated this resend; resend cost is borne by ForteEvents.';
