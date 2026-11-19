-- Allow the sender and authorized Vyro moderators to edit/delete chat messages and their stored attachments.
-- Authorization is enforced by PostgreSQL RLS and Storage policies, not only by client-side controls.

create or replace function public.vyro_can_moderate_chat()
returns boolean
language sql
stable
security invoker
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('owner', 'admin')
  );
$$;

revoke all on function public.vyro_can_moderate_chat() from public, anon;
grant execute on function public.vyro_can_moderate_chat() to authenticated;

drop policy if exists vyro_messages_select_members_or_moderator on public.messages;
create policy vyro_messages_select_members_or_moderator
on public.messages
for select
to authenticated
using (
  private.vyro_is_conversation_member(messages.conversation_id)
  or public.vyro_can_moderate_chat()
);

-- Keep row ownership and conversation membership immutable for authenticated clients.
revoke update on public.messages from authenticated;
grant update (content, file_url, message_type) on public.messages to authenticated;

drop policy if exists vyro_messages_update_sender_or_moderator on public.messages;
create policy vyro_messages_update_sender_or_moderator
on public.messages
for update
to authenticated
using (
  (sender_id = (select auth.uid()) and private.vyro_is_conversation_member(messages.conversation_id))
  or public.vyro_can_moderate_chat()
)
with check (
  sender_id = (select auth.uid())
  or public.vyro_can_moderate_chat()
);

drop policy if exists vyro_messages_delete_sender_or_moderator on public.messages;
create policy vyro_messages_delete_sender_or_moderator
on public.messages
for delete
to authenticated
using (
  (sender_id = (select auth.uid()) and private.vyro_is_conversation_member(messages.conversation_id))
  or public.vyro_can_moderate_chat()
);

drop policy if exists vyro_chat_files_select_owner_or_moderator on storage.objects;
create policy vyro_chat_files_select_owner_or_moderator
on storage.objects
for select
to authenticated
using (
  bucket_id = 'chat-files'
  and (
    (
      (storage.foldername(name))[1] = (select auth.uid())::text
      and private.vyro_is_conversation_member(((storage.foldername(name))[2])::uuid)
    )
    or public.vyro_can_moderate_chat()
  )
);

drop policy if exists vyro_chat_files_insert_sender_or_moderator on storage.objects;
create policy vyro_chat_files_insert_sender_or_moderator
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-files'
  and public.vyro_can_moderate_chat()
);

drop policy if exists vyro_chat_files_update_owner_or_moderator on storage.objects;
create policy vyro_chat_files_update_owner_or_moderator
on storage.objects
for update
to authenticated
using (
  bucket_id = 'chat-files'
  and (
    (
      (storage.foldername(name))[1] = (select auth.uid())::text
      and private.vyro_is_conversation_member(((storage.foldername(name))[2])::uuid)
    )
    or public.vyro_can_moderate_chat()
  )
)
with check (
  bucket_id = 'chat-files'
  and (
    (
      (storage.foldername(name))[1] = (select auth.uid())::text
      and private.vyro_is_conversation_member(((storage.foldername(name))[2])::uuid)
    )
    or public.vyro_can_moderate_chat()
  )
);

drop policy if exists vyro_chat_files_delete_owner_or_moderator on storage.objects;
create policy vyro_chat_files_delete_owner_or_moderator
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'chat-files'
  and (
    (
      (storage.foldername(name))[1] = (select auth.uid())::text
      and private.vyro_is_conversation_member(((storage.foldername(name))[2])::uuid)
    )
    or public.vyro_can_moderate_chat()
  )
);
