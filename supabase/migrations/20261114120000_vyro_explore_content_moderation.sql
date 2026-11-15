-- Allow a user to remove their own Explore content and allow owner/admin moderation.
-- The function is SECURITY DEFINER but checks the authenticated caller and target owner explicitly.
create or replace function public.vyro_delete_explore_content(
  p_content_type text,
  p_content_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_author_id uuid;
  v_is_admin boolean := false;
begin
  if auth.uid() is null then
    raise exception 'برای حذف محتوا باید وارد حساب شوی.';
  end if;

  if p_content_type = 'post' then
    select user_id into v_author_id
    from public.posts
    where id = p_content_id
    for update;
  elsif p_content_type = 'story' then
    select user_id into v_author_id
    from public.stories
    where id = p_content_id
    for update;
  else
    raise exception 'نوع محتوای درخواستی معتبر نیست.';
  end if;

  if v_author_id is null then
    return false;
  end if;

  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('owner', 'admin')
  ) into v_is_admin;

  if v_author_id <> auth.uid() and not v_is_admin then
    raise exception 'فقط منتشرکننده یا مدیریت مجاز به حذف این محتوا است.';
  end if;

  if p_content_type = 'post' then
    delete from public.post_comments where post_id = p_content_id;
    delete from public.post_reactions where post_id = p_content_id;
    delete from public.posts where id = p_content_id;
  else
    delete from public.stories where id = p_content_id;
  end if;

  return true;
end;
$function$;

revoke all on function public.vyro_delete_explore_content(text, uuid) from public, anon;
grant execute on function public.vyro_delete_explore_content(text, uuid) to authenticated;
