create or replace function private.vyro_transfer_conversation_ownership_internal(
  p_conversation_id uuid,
  p_new_owner uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth
as $function$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'Authentication required';
  end if;
  if p_new_owner is null or p_new_owner = v_actor then
    raise exception 'Choose another conversation member';
  end if;
  if not exists (
    select 1 from public.conversations c
    where c.id = p_conversation_id and c.created_by = v_actor
      and c.type in ('group','channel')
  ) then
    raise exception 'Only the current conversation owner can transfer ownership';
  end if;
  if not exists (
    select 1 from public.conversation_members cm
    where cm.conversation_id = p_conversation_id and cm.user_id = p_new_owner
  ) then
    raise exception 'New owner must already be a conversation member';
  end if;
  update public.conversations
  set created_by = p_new_owner
  where id = p_conversation_id and created_by = v_actor;
  if not found then
    raise exception 'Ownership transfer failed';
  end if;
end;
$function$;

create or replace function public.vyro_transfer_conversation_ownership(
  p_conversation_id uuid,
  p_new_owner uuid
)
returns void
language sql
security invoker
set search_path = pg_catalog, public, private, auth
as $function$
  select private.vyro_transfer_conversation_ownership_internal(p_conversation_id,p_new_owner);
$function$;

revoke all on function private.vyro_transfer_conversation_ownership_internal(uuid,uuid) from public, anon;
grant execute on function private.vyro_transfer_conversation_ownership_internal(uuid,uuid) to authenticated;
revoke all on function public.vyro_transfer_conversation_ownership(uuid,uuid) from public, anon;
grant execute on function public.vyro_transfer_conversation_ownership(uuid,uuid) to authenticated;
