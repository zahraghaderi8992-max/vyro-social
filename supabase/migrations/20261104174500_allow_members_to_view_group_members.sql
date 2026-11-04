-- Members of a conversation may see the other members in that same conversation.
-- The helper checks auth.uid() and the membership row; it does not expose other chats.
drop policy if exists vyro_conversation_members_read on public.conversation_members;

create policy vyro_conversation_members_read
on public.conversation_members
for select
to authenticated
using (private.vyro_is_conversation_member(conversation_id));
