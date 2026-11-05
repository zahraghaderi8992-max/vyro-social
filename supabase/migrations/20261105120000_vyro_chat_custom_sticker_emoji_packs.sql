create table if not exists public.chat_sticker_packs (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (char_length(name) between 1 and 48),
 pack_type text not null check (pack_type in ('sticker','emoji')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists chat_sticker_packs_owner_created_idx on public.chat_sticker_packs(owner_id,created_at desc);
create table if not exists public.chat_sticker_pack_items (
 id uuid primary key default gen_random_uuid(),
 pack_id uuid not null references public.chat_sticker_packs(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 item_type text not null check (item_type in ('sticker','emoji')),
 emoji text,
 file_path text,
 created_at timestamptz not null default now(),
 constraint chat_sticker_pack_items_payload_check check (
  (item_type='emoji' and emoji is not null and char_length(emoji) between 1 and 16 and file_path is null)
  or (item_type='sticker' and file_path is not null and emoji is null)
 )
);
create index if not exists chat_sticker_pack_items_pack_created_idx on public.chat_sticker_pack_items(pack_id,created_at);
alter table public.chat_sticker_packs enable row level security;
alter table public.chat_sticker_pack_items enable row level security;
revoke all on public.chat_sticker_packs, public.chat_sticker_pack_items from anon, public;
grant select,insert,update,delete on public.chat_sticker_packs, public.chat_sticker_pack_items to authenticated;
drop policy if exists "Owners manage their sticker packs" on public.chat_sticker_packs;
create policy "Owners manage their sticker packs" on public.chat_sticker_packs
 for all to authenticated using (owner_id=auth.uid()) with check (owner_id=auth.uid());
drop policy if exists "Owners manage their sticker pack items" on public.chat_sticker_pack_items;
create policy "Owners manage their sticker pack items" on public.chat_sticker_pack_items
 for all to authenticated using (
  owner_id=auth.uid() and exists(select 1 from public.chat_sticker_packs p where p.id=pack_id and p.owner_id=auth.uid())
 ) with check (
  owner_id=auth.uid() and exists(select 1 from public.chat_sticker_packs p where p.id=pack_id and p.owner_id=auth.uid())
 );
