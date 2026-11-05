revoke all on table public.conversation_user_settings, public.saved_messages from anon, public;
grant select, insert, update, delete on public.conversation_user_settings to authenticated;
grant select, insert, delete on public.saved_messages to authenticated;
