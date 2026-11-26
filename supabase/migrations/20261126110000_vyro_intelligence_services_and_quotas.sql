-- Independent Vyro AI services, per-user conversation history, preferences and server-enforced daily quotas.
create table if not exists public.vyro_ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  service text not null check (service in ('assistant','support','code','status')),
  title text not null default 'گفت‌وگوی جدید' check (char_length(title) between 1 and 120),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists vyro_ai_conversations_owner_recent_idx on public.vyro_ai_conversations(user_id, service, archived, updated_at desc);

create table if not exists public.vyro_ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.vyro_ai_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null check (char_length(content) between 1 and 24000),
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists vyro_ai_messages_conversation_idx on public.vyro_ai_messages(conversation_id, created_at);

create table if not exists public.vyro_ai_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  custom_instructions text not null default '' check (char_length(custom_instructions) <= 3000),
  tone text not null default 'friendly' check (tone in ('friendly','professional','creative','concise')),
  language text not null default 'auto' check (language in ('auto','fa','en')),
  memory_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.vyro_ai_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  service text not null check (service in ('assistant','support','code','status')),
  kind text not null check (kind in ('message','image','upload')),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date, service, kind)
);

alter table public.vyro_ai_conversations enable row level security;
alter table public.vyro_ai_messages enable row level security;
alter table public.vyro_ai_preferences enable row level security;
alter table public.vyro_ai_daily_usage enable row level security;

drop policy if exists "Users manage own Vyro AI conversations" on public.vyro_ai_conversations;
create policy "Users manage own Vyro AI conversations" on public.vyro_ai_conversations for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own Vyro AI messages" on public.vyro_ai_messages;
create policy "Users manage own Vyro AI messages" on public.vyro_ai_messages for all to authenticated
  using ((select auth.uid()) = user_id and exists (select 1 from public.vyro_ai_conversations c where c.id = conversation_id and c.user_id = (select auth.uid())))
  with check ((select auth.uid()) = user_id and exists (select 1 from public.vyro_ai_conversations c where c.id = conversation_id and c.user_id = (select auth.uid())));

drop policy if exists "Users manage own Vyro AI preferences" on public.vyro_ai_preferences;
create policy "Users manage own Vyro AI preferences" on public.vyro_ai_preferences for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users view own Vyro AI usage" on public.vyro_ai_daily_usage;
create policy "Users view own Vyro AI usage" on public.vyro_ai_daily_usage for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users insert own Vyro AI usage" on public.vyro_ai_daily_usage;
create policy "Users insert own Vyro AI usage" on public.vyro_ai_daily_usage for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users update own Vyro AI usage" on public.vyro_ai_daily_usage;
create policy "Users update own Vyro AI usage" on public.vyro_ai_daily_usage for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.vyro_ai_conversations to authenticated;
grant select, insert, update, delete on public.vyro_ai_messages to authenticated;
grant select, insert, update, delete on public.vyro_ai_preferences to authenticated;
grant select, insert, update on public.vyro_ai_daily_usage to authenticated;

create or replace function public.vyro_consume_ai_quota(p_service text, p_kind text default 'message')
returns jsonb language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_user uuid := auth.uid();
  v_tier text := lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'vyro_tier', 'free'));
  v_limit integer;
  v_count integer;
  v_today date := (now() at time zone 'utc')::date;
begin
  if v_user is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_service not in ('assistant','support','code','status') then raise exception 'Invalid AI service' using errcode = '22023'; end if;
  if p_kind not in ('message','image','upload') then raise exception 'Invalid AI usage kind' using errcode = '22023'; end if;
  if v_tier = 'pro' then v_tier := 'plus'; end if;
  if v_tier not in ('plus','proplus') then v_tier := 'free'; end if;

  if p_kind = 'image' then v_limit := case v_tier when 'proplus' then 60 when 'plus' then 15 else 2 end;
  elsif p_kind = 'upload' then v_limit := case v_tier when 'proplus' then 100 when 'plus' then 30 else 5 end;
  else
    v_limit := case p_service
      when 'assistant' then case v_tier when 'proplus' then 400 when 'plus' then 120 else 25 end
      when 'support' then case v_tier when 'proplus' then 250 when 'plus' then 80 else 25 end
      when 'code' then case v_tier when 'proplus' then 200 when 'plus' then 60 else 8 end
      when 'status' then case v_tier when 'proplus' then 100 when 'plus' then 40 else 12 end
      else 0 end;
  end if;

  insert into public.vyro_ai_daily_usage(user_id, usage_date, service, kind, request_count, updated_at)
  values (v_user, v_today, p_service, p_kind, 1, now())
  on conflict (user_id, usage_date, service, kind)
  do update set request_count = public.vyro_ai_daily_usage.request_count + 1, updated_at = now()
  where public.vyro_ai_daily_usage.request_count < v_limit
  returning request_count into v_count;

  if v_count is null then
    select request_count into v_count from public.vyro_ai_daily_usage
      where user_id = v_user and usage_date = v_today and service = p_service and kind = p_kind;
    return jsonb_build_object('allowed', false, 'tier', v_tier, 'limit', v_limit, 'used', coalesce(v_count,0), 'remaining', 0, 'reset_at', ((v_today + 1)::timestamp at time zone 'utc'));
  end if;
  return jsonb_build_object('allowed', true, 'tier', v_tier, 'limit', v_limit, 'used', v_count, 'remaining', greatest(v_limit - v_count,0), 'reset_at', ((v_today + 1)::timestamp at time zone 'utc'));
end;
$$;
revoke all on function public.vyro_consume_ai_quota(text,text) from public, anon;
grant execute on function public.vyro_consume_ai_quota(text,text) to authenticated;
