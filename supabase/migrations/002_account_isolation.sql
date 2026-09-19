-- Apply after 001_trips.sql. This supplements the owner-only RLS policies.
-- Never rely on the app's user_id filters as the authorization boundary.
begin;

alter table public.trips force row level security;
alter table public.trips alter column user_id set default auth.uid();

-- Remove implicit/public access and give signed-in users only ordinary CRUD.
-- Administrative/service roles remain trusted and must never ship in the app.
revoke all on public.trips from public, anon, authenticated;
grant select, insert, update, delete on public.trips to authenticated;

-- SQL CHECK accepts NULL: explicitly reject a JSON null/non-string title.
alter table public.trips add constraint trip_title_is_string
  check ((jsonb_typeof(payload -> 'title') = 'string') is true);

commit;
