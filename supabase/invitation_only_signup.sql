-- VYRO invitation-only registration
-- Run this entire script in Supabase SQL Editor.
create table if not exists public.invitation_codes (
  code text primary key,
  active boolean not null default true,
  max_uses integer not null default 1 check (max_uses > 0),
  used_count integer not null default 0 check (used_count >= 0),
  created_at timestamptz not null default now()
);

alter table public.invitation_codes enable row level security;
revoke all on public.invitation_codes from anon, authenticated;

create or replace function public.vyro_enforce_invitation_code()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  submitted_code text;
  invitation public.invitation_codes%rowtype;
begin
  submitted_code := upper(trim(coalesce(new.raw_user_meta_data ->> 'invite_code', '')));
  if submitted_code = '' then
    raise exception 'برای ثبت‌نام در وایرو کد دعوت لازم است.';
  end if;

  select * into invitation
  from public.invitation_codes
  where code = submitted_code and active = true
  for update;

  if not found or invitation.used_count >= invitation.max_uses then
    raise exception 'کد دعوت معتبر نیست یا ظرفیت استفاده از آن تمام شده است.';
  end if;

  update public.invitation_codes
  set used_count = used_count + 1
  where code = invitation.code;

  return new;
end;
$$;

drop trigger if exists vyro_invitation_gate on auth.users;
create trigger vyro_invitation_gate
before insert on auth.users
for each row execute function public.vyro_enforce_invitation_code();

-- Example invite code for initial testing. Replace it with your own code if desired.
insert into public.invitation_codes (code, active, max_uses, used_count)
values ('VYRO-START-2026', true, 25, 0)
on conflict (code) do nothing;
