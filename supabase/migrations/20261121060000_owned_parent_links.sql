-- Refuse incompatible legacy data instead of silently rewriting ownership.
do $$ begin
  if exists(select 1 from public.subjects s join public.semesters p on p.id=s.semester_id where s.user_id<>p.user_id)
    or exists(select 1 from public.tasks t join public.subjects s on s.id=t.subject_id where t.user_id<>s.user_id)
    or exists(select 1 from public.task_series t join public.subjects s on s.id=t.subject_id where t.user_id<>s.user_id)
  then raise exception 'Existing cross-account parent links require manual review' using errcode='23514'; end if;
end $$;

create unique index semesters_owner_id_key on public.semesters(user_id,id);
create unique index subjects_owner_id_key on public.subjects(user_id,id);

alter table public.subjects add constraint subjects_owned_semester_fk
  foreign key(user_id,semester_id) references public.semesters(user_id,id) on delete cascade;
alter table public.tasks add constraint tasks_owned_subject_fk
  foreign key(user_id,subject_id) references public.subjects(user_id,id) on delete set null(subject_id);
alter table public.task_series add constraint task_series_owned_subject_fk
  foreign key(user_id,subject_id) references public.subjects(user_id,id) on delete set null(subject_id);

-- Replace old single-column constraints only after the stricter ones validate.
alter table public.subjects drop constraint subjects_semester_id_fkey;
alter table public.tasks drop constraint tasks_subject_id_fkey;
alter table public.task_series drop constraint task_series_subject_id_fkey;
notify pgrst,'reload schema';
