-- Full wedding invitation detail fields for the approved fixed gold template.
alter table public.e_cards
  add column if not exists bride_name text not null default '',
  add column if not exists groom_name text not null default '',
  add column if not exists ceremony_time time,
  add column if not exists ceremony_venue text not null default '',
  add column if not exists reception_time time,
  add column if not exists reception_venue text not null default '',
  add column if not exists food_note text not null default '',
  add column if not exists dress_code text not null default '',
  add column if not exists dress_colors text[] not null default '{}',
  add column if not exists rsvp_deadline date,
  add column if not exists rsvp_contact_name text not null default '',
  add column if not exists rsvp_contact_phone text not null default '',
  add column if not exists rsvp_contact_name_2 text not null default '',
  add column if not exists rsvp_contact_phone_2 text not null default '';
comment on column public.e_cards.dress_colors is 'Up to three dress-code color labels for the fixed invitation artwork.';
