drop policy if exists chat_files_sticker_pack_owner_delete on storage.objects;
create policy chat_files_sticker_pack_owner_delete on storage.objects
 for delete to authenticated using (
  bucket_id='chat-files'
  and (storage.foldername(name))[1]=auth.uid()::text
  and exists(
   select 1 from public.chat_sticker_packs p
   where p.id=((storage.foldername(name))[2])::uuid and p.owner_id=auth.uid()
  )
 );
