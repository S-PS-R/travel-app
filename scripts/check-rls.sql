-- Run in the project's SQL editor. The final rollback removes all fixtures.
-- If an assertion fails, issue ROLLBACK to clear the aborted transaction.
-- Tests database roles and policies; does not replace real login/API isolation tests.
begin;
select set_config('test.owner_a', gen_random_uuid()::text, true);
select set_config('test.owner_b', gen_random_uuid()::text, true);
insert into auth.users (id) values
  (current_setting('test.owner_a')::uuid), (current_setting('test.owner_b')::uuid);
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.owner_a'), true);
insert into public.trips (id, payload) values (current_setting('test.owner_a'),
  jsonb_build_object('id', current_setting('test.owner_a'), 'title', 'Isolation fixture', 'stops', '[]'::jsonb));
do $$ begin
  if not exists (select 1 from public.trips where id = current_setting('test.owner_a')) then
    raise exception 'FAIL: owner cannot read their trip';
  end if;
end $$;
select set_config('request.jwt.claim.sub', current_setting('test.owner_b'), true);
do $$ declare affected integer; begin
  if exists (select 1 from public.trips where id = current_setting('test.owner_a')) then
    raise exception 'FAIL: cross-account read';
  end if;
  update public.trips set payload = jsonb_set(payload, '{title}', '"stolen"') where id = current_setting('test.owner_a');
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FAIL: cross-account update'; end if;
  delete from public.trips where id = current_setting('test.owner_a');
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'FAIL: cross-account delete'; end if;
  begin
    insert into public.trips (id, user_id, payload) values (current_setting('test.owner_b'), current_setting('test.owner_a')::uuid,
      jsonb_build_object('id', current_setting('test.owner_b'), 'title', 'Spoof', 'stops', '[]'::jsonb));
    raise exception 'FAIL: spoofed owner insert';
  exception when insufficient_privilege then null;
  end;
end $$;
select set_config('request.jwt.claim.sub', current_setting('test.owner_a'), true);
do $$ begin
  begin
    update public.trips set user_id = current_setting('test.owner_b')::uuid where id = current_setting('test.owner_a');
    raise exception 'FAIL: owner reassignment';
  exception when insufficient_privilege then null;
  end;
  if not exists (select 1 from public.trips where id = current_setting('test.owner_a') and payload->>'title' = 'Isolation fixture') then
    raise exception 'FAIL: original record changed';
  end if;
end $$;
reset role;
set local role anon;
do $$ begin
  begin
    perform id from public.trips limit 1;
    raise exception 'FAIL: anonymous read';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
select 'PASS: database role isolation; all fixtures rolled back' as result;
