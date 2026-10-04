begin;
create table public.plans (
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 id text not null,
 payload jsonb not null,
 revision integer not null default 1 check(revision>0),
 primary key(user_id,id),
 constraint valid_plan check ((jsonb_typeof(payload)='object' and payload->>'id'=id and jsonb_typeof(payload->'title')='string' and length(payload->>'title') between 1 and 120 and jsonb_typeof(payload->'stops')='array') is true)
);
alter table public.plans enable row level security;
alter table public.plans force row level security;
revoke all on public.plans from public,anon,authenticated;
grant select,insert,update,delete on public.plans to authenticated;
create policy "Owners manage plans" on public.plans to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
-- EXTENDED allows PostgreSQL's transparent lossless TOAST compression.
alter table public.plans alter column payload set storage extended;
alter table public.trips alter column payload set storage extended;
commit;
