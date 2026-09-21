-- Friends share visited map locations only. Trip RLS remains owner-only.
begin;
create table public.friendships (
 id uuid primary key default gen_random_uuid(),
 requester uuid not null references auth.users(id) on delete cascade,
 recipient uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending' check (status in ('pending','accepted')),
 created_at timestamptz not null default now(),
 check(requester <> recipient)
);
create unique index friendships_pair on public.friendships(least(requester,recipient),greatest(requester,recipient));
create index friendships_recipient on public.friendships(recipient);
alter table public.friendships enable row level security;
alter table public.friendships force row level security;
revoke all on public.friendships from public,anon,authenticated;
grant select on public.friendships to authenticated;
create policy "Members see their friendships" on public.friendships for select to authenticated using(auth.uid() in (requester,recipient));

create table public.friend_request_attempts (
 user_id uuid primary key references auth.users(id) on delete cascade,
 window_start timestamptz not null default now(),
 attempts integer not null default 1
);
alter table public.friend_request_attempts enable row level security;
alter table public.friend_request_attempts force row level security;
revoke all on public.friend_request_attempts from public,anon,authenticated;

create function public.request_friend(target_email text) returns void
language plpgsql security definer set search_path='' as $$
declare caller uuid:=auth.uid(); target uuid; attempts_used integer;
begin
 if caller is null or not exists(select 1 from auth.users where id=caller and email_confirmed_at is not null) then raise exception 'Sign in with a verified account first.'; end if;
 if length(target_email)>254 or lower(trim(target_email)) !~ '^[a-z0-9.!#$%&''*+/=?^_`{|}~-]+@gmail\.com$' then raise exception 'Enter a valid Gmail address.'; end if;
 insert into public.friend_request_attempts(user_id) values(caller)
 on conflict(user_id) do update set
 attempts=case when friend_request_attempts.window_start < now()-interval '1 hour' then 1 else friend_request_attempts.attempts+1 end,
 window_start=case when friend_request_attempts.window_start < now()-interval '1 hour' then now() else friend_request_attempts.window_start end
 returning attempts into attempts_used;
 if attempts_used>10 then raise exception 'Please wait before sending more friend requests.'; end if;
 select id into target from auth.users where lower(email)=lower(trim(target_email)) and email_confirmed_at is not null limit 1;
 -- Generic response; outgoing request listings still reveal exact-address matches.
 if target is null or target=caller then return; end if;
 insert into public.friendships(requester,recipient) values(caller,target) on conflict do nothing;
end; $$;

create function public.accept_friend(friendship_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in first.'; end if;
 update public.friendships set status='accepted' where id=friendship_id and recipient=auth.uid() and status='pending';
 if not found then raise exception 'This incoming request is no longer available.'; end if;
end; $$;

create function public.remove_friend(friendship_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in first.'; end if;
 delete from public.friendships where id=friendship_id and auth.uid() in (requester,recipient);
end; $$;

create function public.list_friends() returns table(id uuid,other_id uuid,name text,email text,status text,incoming boolean)
language sql stable security definer set search_path='' as $$
 select f.id,u.id,left(coalesce(nullif(u.raw_user_meta_data->>'full_name',''),nullif(u.raw_user_meta_data->>'name',''),'Traveler'),100),u.email::text,f.status,f.recipient=auth.uid()
 from public.friendships f join auth.users u on u.id=case when f.requester=auth.uid() then f.recipient else f.requester end
 where auth.uid() in (f.requester,f.recipient)
 order by f.created_at desc;
$$;

create function public.friend_map_pins() returns table(owner_id uuid,name text,city text,country text,country_id text,lat double precision,lon double precision)
language sql stable security definer set search_path='' as $$
 with friends as (
  select case when requester=auth.uid() then recipient else requester end as uid
  from public.friendships where status='accepted' and auth.uid() in(requester,recipient)
 ), locations as (
  select t.user_id,u.raw_user_meta_data,stop->'place' as place
  from friends f join public.trips t on t.user_id=f.uid join auth.users u on u.id=f.uid
  cross join lateral jsonb_array_elements(t.payload->'stops') stop
  where stop->>'arrival' ~ '^\d{4}-\d{2}-\d{2}$' and stop->>'arrival'<=to_char(current_date,'YYYY-MM-DD')
 ), valid as (
  select *,case when jsonb_typeof(place->'lat')='number' then (place->>'lat')::numeric end as latitude,
  case when jsonb_typeof(place->'lon')='number' then (place->>'lon')::numeric end as longitude
  from locations
 )
 select distinct user_id,left(coalesce(nullif(raw_user_meta_data->>'full_name',''),nullif(raw_user_meta_data->>'name',''),'Traveler'),100),
 left(place->>'city',120),left(place->>'country',120),left(place->>'countryId',10),latitude::double precision,longitude::double precision
 from valid where latitude between -90 and 90 and longitude between -180 and 180
 and jsonb_typeof(place->'city')='string' and jsonb_typeof(place->'country')='string' and jsonb_typeof(place->'countryId')='string'
 limit 10000;
$$;

revoke all on function public.request_friend(text),public.accept_friend(uuid),public.remove_friend(uuid),public.list_friends(),public.friend_map_pins() from public,anon;
grant execute on function public.request_friend(text),public.accept_friend(uuid),public.remove_friend(uuid),public.list_friends(),public.friend_map_pins() to authenticated;
commit;
