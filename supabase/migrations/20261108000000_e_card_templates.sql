-- Admin-managed E-card templates. Customer-created cards remain separate in public.e_cards.
create table if not exists public.e_card_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  occasion text not null default 'Harusi',
  description text not null default '',
  image_url text not null,
  theme text not null default 'gold' check (theme in ('gold','classic')),
  design jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists e_card_templates_active_idx on public.e_card_templates (is_active, created_at desc);
alter table public.e_card_templates enable row level security;
drop policy if exists "Anyone can view active E-card templates" on public.e_card_templates;
create policy "Anyone can view active E-card templates" on public.e_card_templates
  for select to anon, authenticated using (is_active = true);
drop policy if exists "Admins manage E-card templates" on public.e_card_templates;
create policy "Admins manage E-card templates" on public.e_card_templates
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
  with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));
grant select on public.e_card_templates to anon, authenticated;
grant insert, update, delete on public.e_card_templates to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('e-card-templates','e-card-templates',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=5242880,
allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists "Public view E-card template images" on storage.objects;
create policy "Public view E-card template images" on storage.objects
for select to anon, authenticated using (bucket_id='e-card-templates');
drop policy if exists "Admins upload E-card template images" on storage.objects;
create policy "Admins upload E-card template images" on storage.objects
for insert to authenticated with check (
 bucket_id='e-card-templates' and exists
 (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
);
drop policy if exists "Admins update E-card template images" on storage.objects;
create policy "Admins update E-card template images" on storage.objects
for update to authenticated using (
 bucket_id='e-card-templates' and exists
 (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
) with check (
 bucket_id='e-card-templates' and exists
 (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
);
drop policy if exists "Admins delete E-card template images" on storage.objects;
create policy "Admins delete E-card template images" on storage.objects
for delete to authenticated using (
 bucket_id='e-card-templates' and exists
 (select 1 from public.profiles p where p.id=auth.uid() and p.role='admin')
);
