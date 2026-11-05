drop policy if exists chat_files_sticker_pack_owner_insert on storage.objects;
create policy chat_files_sticker_pack_owner_insert on storage.objects
for insert to authenticated with check (
 bucket_id='chat-files'
 and (storage.foldername(name))[1]=auth.uid()::text
 and exists(select 1 from public.chat_sticker_packs p where p.id=((storage.foldername(name))[2])::uuid and p.owner_id=auth.uid())
);
drop policy if exists chat_files_sticker_pack_owner_read on storage.objects;
create policy chat_files_sticker_pack_owner_read on storage.objects
for select to authenticated using (
 bucket_id='chat-files'
 and exists(select 1 from public.chat_sticker_pack_items i where i.file_path=name and i.owner_id=auth.uid())
);
