create table if not exists public.conversation_user_settings (
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  archived boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, conversation_id)
);

create table if not exists public.saved_messages (
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, message_id)
);

alter table public.conversation_user_settings enable row level security;
alter table public.saved_messages enable row level security;

drop policy if exists "Users read own conversation settings" on public.conversation_user_settings;
create policy "Users read own conversation settings"
on public.conversation_user_settings for select to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = conversation_user_settings.conversation_id
      and cm.user_id = (select auth.uid())
  )
);

drop policy if exists "Users insert own conversation settings" on public.conversation_user_settings;
create policy "Users insert own conversation settings"
on public.conversation_user_settings for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = conversation_user_settings.conversation_id
      and cm.user_id = (select auth.uid())
  )
);

drop policy if exists "Users update own conversation settings" on public.conversation_user_settings;
create policy "Users update own conversation settings"
on public.conversation_user_settings for update to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = conversation_user_settings.conversation_id
      and cm.user_id = (select auth.uid())
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = conversation_user_settings.conversation_id
      and cm.user_id = (select auth.uid())
  )
);

drop policy if exists "Users delete own conversation settings" on public.conversation_user_settings;
create policy "Users delete own conversation settings"
on public.conversation_user_settings for delete to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = conversation_user_settings.conversation_id
      and cm.user_id = (select auth.uid())
  )
);

drop policy if exists "Users read own saved messages" on public.saved_messages;
create policy "Users read own saved messages"
on public.saved_messages for select to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.messages m
    join public.conversation_members cm on cm.conversation_id = m.conversation_id
    where m.id = saved_messages.message_id
      and cm.user_id = (select auth.uid())
  )
);

drop policy if exists "Users save messages from conversations they belong to" on public.saved_messages;
create policy "Users save messages from conversations they belong to"
on public.saved_messages for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.messages m
    join public.conversation_members cm on cm.conversation_id = m.conversation_id
    where m.id = saved_messages.message_id
      and cm.user_id = (select auth.uid())
  )
);

drop policy if exists "Users unsave own messages" on public.saved_messages;
create policy "Users unsave own messages"
on public.saved_messages for delete to authenticated
using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.conversation_user_settings to authenticated;
grant select, insert, delete on public.saved_messages to authenticated;

create index if not exists conversation_user_settings_conversation_id_idx
  on public.conversation_user_settings(conversation_id);
create index if not exists saved_messages_message_id_idx
  on public.saved_messages(message_id);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='conversation_user_settings') then
      alter publication supabase_realtime add table public.conversation_user_settings;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='saved_messages') then
      alter publication supabase_realtime add table public.saved_messages;
    end if;
  end if;
end $$;
