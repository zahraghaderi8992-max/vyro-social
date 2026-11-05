alter table public.chat_sticker_packs
 add column if not exists is_public boolean not null default false,
 add column if not exists description text,
 add column if not exists share_code text;
update public.chat_sticker_packs
 set share_code=lower(substr(replace(gen_random_uuid()::text,'-',''),1,12))
 where share_code is null;
alter table public.chat_sticker_packs
 alter column share_code set default lower(substr(replace(gen_random_uuid()::text,'-',''),1,12));
create unique index if not exists chat_sticker_packs_share_code_uidx on public.chat_sticker_packs(share_code);
create index if not exists chat_sticker_packs_public_created_idx on public.chat_sticker_packs(is_public,created_at desc) where is_public=true;
drop policy if exists "Public can view shared sticker packs" on public.chat_sticker_packs;
create policy "Public can view shared sticker packs" on public.chat_sticker_packs
 for select to authenticated using (is_public=true);
drop policy if exists "Public can view shared sticker pack items" on public.chat_sticker_pack_items;
create policy "Public can view shared sticker pack items" on public.chat_sticker_pack_items
 for select to authenticated using (
  exists(select 1 from public.chat_sticker_packs p where p.id=pack_id and p.is_public=true)
 );
drop policy if exists chat_files_sticker_pack_owner_read on storage.objects;
create policy chat_files_sticker_pack_owner_read on storage.objects
 for select to authenticated using (
  bucket_id='chat-files'
  and exists(
   select 1 from public.chat_sticker_pack_items i
   join public.chat_sticker_packs p on p.id=i.pack_id
   where i.file_path=name and (i.owner_id=auth.uid() or p.is_public=true)
  )
 );
