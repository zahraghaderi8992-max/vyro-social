-- Remove exact duplicate indexes and add indexes for conversation_pins foreign keys.
drop index if exists public.messages_conversation_idx;
drop index if exists public.posts_created_idx;
drop index if exists public.stories_expires_at_idx;
create index if not exists conversation_pins_message_id_idx on public.conversation_pins(message_id);
create index if not exists conversation_pins_pinned_by_idx on public.conversation_pins(pinned_by);

-- Cache auth.uid() once per statement in row-level security expressions.
alter policy vyro_pins_delete_members on public.conversation_pins
  using (exists (select 1 from public.conversation_members cm where cm.conversation_id = conversation_pins.conversation_id and cm.user_id = (select auth.uid())));
alter policy vyro_pins_insert_members on public.conversation_pins
  with check (pinned_by = (select auth.uid()) and exists (select 1 from public.conversation_members cm where cm.conversation_id = conversation_pins.conversation_id and cm.user_id = (select auth.uid())) and exists (select 1 from public.messages m where m.id = conversation_pins.message_id and m.conversation_id = conversation_pins.conversation_id));
alter policy vyro_pins_read_members on public.conversation_pins
  using (exists (select 1 from public.conversation_members cm where cm.conversation_id = conversation_pins.conversation_id and cm.user_id = (select auth.uid())));

alter policy vyro_reactions_delete_self on public.message_reactions
  using (user_id = (select auth.uid()));
alter policy vyro_reactions_insert_self_member on public.message_reactions
  with check (user_id = (select auth.uid()) and exists (select 1 from public.messages m join public.conversation_members cm on cm.conversation_id = m.conversation_id where m.id = message_reactions.message_id and cm.user_id = (select auth.uid())));
alter policy vyro_reactions_read_members on public.message_reactions
  using (exists (select 1 from public.messages m join public.conversation_members cm on cm.conversation_id = m.conversation_id where m.id = message_reactions.message_id and cm.user_id = (select auth.uid())));
alter policy vyro_reactions_update_self_member on public.message_reactions
  using (user_id = (select auth.uid()) and exists (select 1 from public.messages m join public.conversation_members cm on cm.conversation_id = m.conversation_id where m.id = message_reactions.message_id and cm.user_id = (select auth.uid())))
  with check (user_id = (select auth.uid()) and exists (select 1 from public.messages m join public.conversation_members cm on cm.conversation_id = m.conversation_id where m.id = message_reactions.message_id and cm.user_id = (select auth.uid())));

alter policy vyro_reads_insert_self_member on public.message_reads
  with check (user_id = (select auth.uid()) and exists (select 1 from public.messages m join public.conversation_members cm on cm.conversation_id = m.conversation_id where m.id = message_reads.message_id and cm.user_id = (select auth.uid())));
alter policy vyro_reads_read_members on public.message_reads
  using (exists (select 1 from public.messages m join public.conversation_members cm on cm.conversation_id = m.conversation_id where m.id = message_reads.message_id and cm.user_id = (select auth.uid())));

-- Separate read-all from own-row writes so SELECT no longer has two permissive policies.
drop policy if exists "Users manage own post reactions" on public.post_reactions;
create policy post_reactions_insert_own on public.post_reactions for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy post_reactions_update_own on public.post_reactions for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy post_reactions_delete_own on public.post_reactions for delete to authenticated
  using (user_id = (select auth.uid()));
