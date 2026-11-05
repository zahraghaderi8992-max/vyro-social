-- This legacy table is intentionally unavailable through the public Data API.
-- Account signup validates each user's referral code through the protected profile trigger.
drop policy if exists invitation_codes_locked on public.invitation_codes;
create policy invitation_codes_locked
on public.invitation_codes
for all
to anon, authenticated
using (false)
with check (false);
