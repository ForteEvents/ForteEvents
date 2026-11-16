create index if not exists e_card_guests_card_id_created_at_idx
  on public.e_card_guests (card_id, created_at);

create index if not exists e_card_guests_whatsapp_message_id_idx
  on public.e_card_guests (whatsapp_message_id)
  where whatsapp_message_id is not null;
