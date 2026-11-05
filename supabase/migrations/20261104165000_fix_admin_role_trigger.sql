-- Allow the trusted SECURITY DEFINER admin RPC to promote/demote admins.
-- Direct client updates still run as authenticated and remain blocked.
create or replace function public.prevent_profile_role_self_change()
returns trigger
language plpgsql
set search_path = public
as $function$
begin
  if current_user = 'authenticated'
     and new.role is distinct from old.role
     and auth.uid() is not null then
    raise exception 'Profile role cannot be changed from the client';
  end if;
  return new;
end;
$function$;
