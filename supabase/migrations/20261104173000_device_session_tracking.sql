-- Track authenticated browser/app sessions without exposing Auth refresh tokens.
alter table public.devices
  add column if not exists session_id uuid,
  add column if not exists browser text,
  add column if not exists entry_path text,
  add column if not exists login_at timestamptz not null default now(),
  add column if not exists revoked_at timestamptz;

create unique index if not exists devices_session_id_unique
  on public.devices(session_id)
  where session_id is not null;

create index if not exists devices_user_last_active_idx
  on public.devices(user_id, last_active desc);

grant select, insert, update on public.devices to authenticated;

-- Existing own-device RLS policies remain the authorization boundary:
-- users can only list, register, and update rows whose user_id is auth.uid().
