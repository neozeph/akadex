-- Existing and new accounts use one explicit initial calendar timezone.
alter table public.profiles
  add column if not exists timezone text not null default 'Asia/Manila';

notify pgrst, 'reload schema';
