-- Man Matters Companion (concept, unofficial) - Phase 4: student verification, referrals, loyalty.
-- Run ONCE in the Supabase SQL editor, after schema.sql, phase2.sql and phase3.sql.

-- ---------- Student verification ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('student-ids', 'student-ids', false, 3145728, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 3145728, allowed_mime_types = array['image/jpeg'];

drop policy if exists stuid_select on storage.objects;
drop policy if exists stuid_insert on storage.objects;
drop policy if exists stuid_delete on storage.objects;
create policy stuid_select on storage.objects for select to authenticated
  using (bucket_id = 'student-ids' and (storage.foldername(name))[1] = auth.uid()::text);
create policy stuid_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'student-ids' and (storage.foldername(name))[1] = auth.uid()::text);
create policy stuid_delete on storage.objects for delete to authenticated
  using (bucket_id = 'student-ids' and (storage.foldername(name))[1] = auth.uid()::text);

create table if not exists public.student_verifications (
  user_id uuid primary key references auth.users on delete cascade,
  college text not null check (char_length(college) between 2 and 120),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  id_path text,
  consent_at timestamptz not null,
  submitted_at timestamptz not null default now(),
  decided_at timestamptz,
  valid_until date
);
alter table public.student_verifications enable row level security;
drop policy if exists sv_read on public.student_verifications;
drop policy if exists sv_insert on public.student_verifications;
drop policy if exists sv_update on public.student_verifications;
drop policy if exists sv_delete on public.student_verifications;
create policy sv_read on public.student_verifications for select using (auth.uid() = user_id);
create policy sv_insert on public.student_verifications for insert
  with check (auth.uid() = user_id and status = 'pending' and decided_at is null and valid_until is null);
create policy sv_update on public.student_verifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy sv_delete on public.student_verifications for delete using (auth.uid() = user_id);

-- A signed-in user can never approve themselves: only a decision made from the SQL editor (no user session) can change it.
create or replace function public.protect_student_verification() returns trigger language plpgsql as $$
begin
  if auth.uid() is not null then
    if new.valid_until is distinct from old.valid_until or new.decided_at is distinct from old.decided_at then
      raise exception 'Only the reviewer can change the decision';
    end if;
    if new.status is distinct from old.status and not (old.status in ('pending','rejected') and new.status = 'pending') then
      raise exception 'Only the reviewer can change the decision';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists student_verifications_guard on public.student_verifications;
create trigger student_verifications_guard before update on public.student_verifications
  for each row execute function public.protect_student_verification();

-- The reviewer (you) runs these in the SQL editor after looking at the ID photo in Storage > student-ids:
--   select approve_student('<user id>');          -- valid for 365 days
--   select reject_student('<user id>');
create or replace function public.approve_student(p_user uuid, p_days int default 365) returns void
language sql security definer set search_path = public as $$
  update public.student_verifications set status = 'approved', decided_at = now(), valid_until = current_date + p_days where user_id = p_user;
$$;
create or replace function public.reject_student(p_user uuid) returns void
language sql security definer set search_path = public as $$
  update public.student_verifications set status = 'rejected', decided_at = now(), valid_until = null where user_id = p_user;
$$;
revoke all on function public.approve_student(uuid, int) from public, anon, authenticated;
revoke all on function public.reject_student(uuid) from public, anon, authenticated;

-- ---------- Referrals ----------
create table if not exists public.referral_codes (
  user_id uuid primary key references auth.users on delete cascade,
  code text not null unique
);
create table if not exists public.referrals (
  referee_id uuid primary key references auth.users on delete cascade,
  referrer_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  check (referee_id <> referrer_id)
);
alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;
drop policy if exists rc_read on public.referral_codes;
drop policy if exists ref_read on public.referrals;
create policy rc_read on public.referral_codes for select using (auth.uid() = user_id);
create policy ref_read on public.referrals for select using (auth.uid() = referrer_id or auth.uid() = referee_id);
-- No insert policies: rows are only created by the two functions below.

create or replace function public.my_referral_code() returns text
language plpgsql security definer set search_path = public as $$
declare c text; i int := 0;
begin
  if auth.uid() is null then return null; end if;
  select code into c from referral_codes where user_id = auth.uid();
  if c is not null then return c; end if;
  loop
    c := 'MM' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    begin
      insert into referral_codes(user_id, code) values (auth.uid(), c);
      return c;
    exception when unique_violation then
      select code into c from referral_codes where user_id = auth.uid();
      if c is not null then return c; end if;
      i := i + 1; if i > 5 then raise; end if;
    end;
  end loop;
end $$;

create or replace function public.claim_referral(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare r uuid;
begin
  if auth.uid() is null then return 'auth'; end if;
  select user_id into r from referral_codes where code = upper(trim(p_code));
  if r is null then return 'invalid'; end if;
  if r = auth.uid() then return 'own'; end if;
  insert into referrals(referee_id, referrer_id) values (auth.uid(), r) on conflict do nothing;
  if not found then return 'already'; end if;
  return 'ok';
end $$;

-- ---------- Loyalty points and rewards ----------
create table if not exists public.rewards (id text primary key, title text not null, cost int not null check (cost > 0));
insert into public.rewards (id, title, cost) values
  ('delivery', 'Free delivery on next order (concept)', 150),
  ('off5', '5% off next order (concept)', 300),
  ('off10', '10% off next order (concept)', 600)
on conflict (id) do update set title = excluded.title, cost = excluded.cost;
alter table public.rewards enable row level security;
drop policy if exists rewards_read on public.rewards;
create policy rewards_read on public.rewards for select to authenticated using (true);

create table if not exists public.redemptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  reward_id text not null references public.rewards(id),
  cost int not null,
  created_at timestamptz not null default now()
);
alter table public.redemptions enable row level security;
drop policy if exists red_read on public.redemptions;
create policy red_read on public.redemptions for select using (auth.uid() = user_id);

-- Points are worked out from the data itself (10 per check-in, 20 per weekly rating, 15 per photo,
-- 100 per friend who joins with your code (max 10 friends), 50 for joining with a code) minus what was redeemed.
create or replace function public.loyalty_summary() returns json
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid(); pts int; spent int; refd int; joined int;
begin
  if uid is null then return json_build_object('earned', 0, 'spent', 0, 'balance', 0, 'referred', 0); end if;
  select count(*) into pts from checkins where user_id = uid and applied;
  pts := pts * 10 + (select count(*) from ratings where user_id = uid) * 20 + (select count(*) from photos where user_id = uid) * 15;
  select count(*) into refd from referrals where referrer_id = uid;
  select count(*) into joined from referrals where referee_id = uid;
  pts := pts + least(refd, 10) * 100 + joined * 50;
  select coalesce(sum(cost), 0) into spent from redemptions where user_id = uid;
  return json_build_object('earned', pts, 'spent', spent, 'balance', pts - spent, 'referred', refd);
end $$;

create or replace function public.redeem_reward(p_reward text) returns json
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); c int; bal int;
begin
  if uid is null then return json_build_object('ok', false, 'reason', 'auth'); end if;
  select cost into c from rewards where id = p_reward;
  if c is null then return json_build_object('ok', false, 'reason', 'unknown'); end if;
  perform pg_advisory_xact_lock(hashtext(uid::text));
  bal := (loyalty_summary() ->> 'balance')::int;
  if bal < c then return json_build_object('ok', false, 'reason', 'balance'); end if;
  insert into redemptions(user_id, reward_id, cost) values (uid, p_reward, c);
  return json_build_object('ok', true, 'balance', bal - c);
end $$;

revoke all on function public.my_referral_code() from public, anon;
revoke all on function public.claim_referral(text) from public, anon;
revoke all on function public.loyalty_summary() from public, anon;
revoke all on function public.redeem_reward(text) from public, anon;
grant execute on function public.my_referral_code() to authenticated;
grant execute on function public.claim_referral(text) to authenticated;
grant execute on function public.loyalty_summary() to authenticated;
grant execute on function public.redeem_reward(text) to authenticated;
