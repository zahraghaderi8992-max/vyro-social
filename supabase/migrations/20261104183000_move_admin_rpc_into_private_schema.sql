-- Keep the PostgREST entry point invoker-only; the guarded implementation lives in the non-exposed private schema.
alter function public.vyro_admin_manage_user(uuid,text,jsonb) set schema private;
alter function private.vyro_admin_manage_user(uuid,text,jsonb) rename to vyro_admin_manage_user_internal;

create function public.vyro_admin_manage_user(
  p_target_user uuid,
  p_action text,
  p_permissions jsonb default null
)
returns jsonb
language sql
security invoker
set search_path = pg_catalog, public, private, auth
as $function$
  select private.vyro_admin_manage_user_internal(p_target_user,p_action,p_permissions);
$function$;

revoke all on function private.vyro_admin_manage_user_internal(uuid,text,jsonb) from public, anon;
grant execute on function private.vyro_admin_manage_user_internal(uuid,text,jsonb) to authenticated;

revoke all on function public.vyro_admin_manage_user(uuid,text,jsonb) from public, anon;
grant execute on function public.vyro_admin_manage_user(uuid,text,jsonb) to authenticated;
