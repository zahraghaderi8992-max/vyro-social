-- Referral identity is generated during account creation and must not be editable by clients.
create or replace function public.vyro_protect_privileged_profile_fields()
returns trigger
language plpgsql
set search_path = public, auth
as $function$
begin
  if current_user = 'authenticated' and (
    new.role is distinct from old.role or
    new.account_status is distinct from old.account_status or
    new.admin_permissions is distinct from old.admin_permissions or
    new.invite_code is distinct from old.invite_code or
    new.invited_by is distinct from old.invited_by
  ) then
    raise exception 'نقش، وضعیت حساب، دسترسی مدیریتی و اطلاعات معرف فقط از مسیر امن سرور قابل تغییر هستند.';
  end if;
  return new;
end;
$function$;
