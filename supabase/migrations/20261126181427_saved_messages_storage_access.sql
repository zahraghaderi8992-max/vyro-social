create policy "chat_files_saved_items_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] = '00000000-0000-0000-0000-000000000000'
);

create policy "chat_files_saved_items_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'chat-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] = '00000000-0000-0000-0000-000000000000'
);

create policy "chat_files_saved_items_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'chat-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (storage.foldername(name))[2] = '00000000-0000-0000-0000-000000000000'
);
