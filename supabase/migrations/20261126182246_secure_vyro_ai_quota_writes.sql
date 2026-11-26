-- Prevent clients from forging or resetting their own AI usage counters.
drop policy if exists "Users insert own Vyro AI usage" on public.vyro_ai_daily_usage;
drop policy if exists "Users update own Vyro AI usage" on public.vyro_ai_daily_usage;
revoke insert, update, delete on public.vyro_ai_daily_usage from anon, authenticated;
grant select on public.vyro_ai_daily_usage to authenticated;

-- Quota increments are performed only through this narrow, authenticated RPC.
-- The function checks auth.uid() and accepts only fixed service/kind values.
create or replace function public.vyro_consume_ai_quota(p_service text, p_kind text default 'message')
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_tier text := lower(coalesce(auth.jwt() -> 'app_metadata' ->> 'vyro_tier', 'free'));
  v_limit integer;
  v_count integer;
  v_today date := (now() at time zone 'utc')::date;
begin
  if v_user is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  if p_service is null or p_service not in ('assistant','support','code','status') then
    raise exception 'Invalid AI service' using errcode = '22023';
  end if;
  if p_kind is null or p_kind not in ('message','image','upload') then
    raise exception 'Invalid AI usage kind' using errcode = '22023';
  end if;

  if v_tier = 'pro' then v_tier := 'plus'; end if;
  if v_tier not in ('plus','proplus') then v_tier := 'free'; end if;

  if p_kind = 'image' then
    v_limit := case v_tier when 'proplus' then 60 when 'plus' then 15 else 2 end;
  elsif p_kind = 'upload' then
    v_limit := case v_tier when 'proplus' then 100 when 'plus' then 30 else 5 end;
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
    return jsonb_build_object('allowed', false, 'tier', v_tier, 'limit', v_limit,
      'used', coalesce(v_count,0), 'remaining', 0,
      'reset_at', ((v_today + 1)::timestamp at time zone 'utc'));
  end if;

  return jsonb_build_object('allowed', true, 'tier', v_tier, 'limit', v_limit,
    'used', v_count, 'remaining', greatest(v_limit - v_count,0),
    'reset_at', ((v_today + 1)::timestamp at time zone 'utc'));
end;
$$;

revoke all on function public.vyro_consume_ai_quota(text,text) from public, anon;
grant execute on function public.vyro_consume_ai_quota(text,text) to authenticated;
