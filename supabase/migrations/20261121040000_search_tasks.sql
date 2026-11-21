-- SQL arguments are literal data; substring search needs no PostgREST OR grammar.
-- Invoker rights and the ownership predicate retain task/relationship RLS.
create function public.search_tasks(
  p_search text default '',
  p_status public.task_status default null,
  p_subject uuid default null,
  p_priority public.task_priority default null
) returns setof public.tasks
language sql stable security invoker
as $$
  select t.* from public.tasks t
  where t.user_id = auth.uid()
    and ((p_status is null and t.status <> 'done') or t.status = p_status)
    and (p_subject is null or t.subject_id = p_subject)
    and (p_priority is null or t.priority = p_priority)
    and pg_catalog.char_length(coalesce(p_search, '')) <= 200
    and (
      coalesce(pg_catalog.btrim(p_search), '') = ''
      or pg_catalog.strpos(pg_catalog.lower(t.title), pg_catalog.lower(pg_catalog.btrim(p_search))) > 0
      or pg_catalog.strpos(pg_catalog.lower(coalesce(t.description, '')), pg_catalog.lower(pg_catalog.btrim(p_search))) > 0
      or exists (
        select 1 from pg_catalog.unnest(t.tags) as tag
        where pg_catalog.strpos(pg_catalog.lower(tag), pg_catalog.lower(pg_catalog.btrim(p_search))) > 0
      )
    );
$$;
revoke all on function public.search_tasks(text,public.task_status,uuid,public.task_priority) from public, anon;
grant execute on function public.search_tasks(text,public.task_status,uuid,public.task_priority) to authenticated;
notify pgrst, 'reload schema';
