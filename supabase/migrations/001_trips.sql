-- Run once in the SQL editor of your own Supabase project.
-- Only the authenticated owner can read or modify a trip.
create table public.trips (
 id text primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 payload jsonb not null,
 updated_at timestamptz not null default now(),
 constraint valid_payload check (
   jsonb_typeof(payload) = 'object'
   and payload ? 'id' and payload ? 'title' and payload ? 'stops'
   and payload->>'id' = id
   and jsonb_typeof(payload->'stops') = 'array'
   and length(payload->>'title') between 1 and 120
 )
);
create index trips_owner_idx on public.trips(user_id);
alter table public.trips enable row level security;
revoke all on public.trips from anon;
grant select, insert, update, delete on public.trips to authenticated;
create policy "Owners read their trips" on public.trips for select to authenticated using ((select auth.uid()) = user_id);
create policy "Owners create their trips" on public.trips for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Owners edit their trips" on public.trips for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Owners delete their trips" on public.trips for delete to authenticated using ((select auth.uid()) = user_id);
create function public.touch_trip() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger touch_trip_updated_at before update on public.trips for each row execute function public.touch_trip();
