-- Saved Messages as per-user self-chat entries and verified security-login audit events.
create table if not exists public.saved_message_items (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 content text not null default '',
 file_url text,
 message_type text not null default 'text',
 source_conversation_id uuid,
 source_message_id uuid,
 source_title text,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
create index if not exists saved_message_items_owner_recent_idx on public.saved_message_items(user_id, created_at desc);
alter table public.saved_message_items enable row level security;
drop policy if exists "Users manage own saved message items" on public.saved_message_items;
create policy "Users manage own saved message items" on public.saved_message_items for all to authenticated
 using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on public.saved_message_items to authenticated;

create table if not exists public.security_login_events (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 session_id text not null,
 login_method text not null default 'unknown',
 platform text not null default 'unknown',
 device_model text not null default 'unknown',
 browser text not null default 'unknown',
 entry_path text not null default 'Vyro',
 ip_address inet,
 user_agent text,
 support_conversation_id uuid,
 created_at timestamptz not null default now(),
 unique(user_id, session_id)
);
create index if not exists security_login_events_owner_recent_idx on public.security_login_events(user_id, created_at desc);
alter table public.security_login_events enable row level security;
drop policy if exists "Users view own security login events" on public.security_login_events;
create policy "Users view own security login events" on public.security_login_events for select to authenticated using ((select auth.uid()) = user_id);
grant select on public.security_login_events to authenticated;
