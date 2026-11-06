-- Man Matters Companion (concept, unofficial) - Phase 6: assistant limits and the brand dashboard.
-- Run ONCE after phase4.sql.

-- ---------- Assistant: per-person daily limit, counted in the database ----------
create table if not exists public.assistant_usage (
  user_id uuid not null references auth.users on delete cascade,
  day date not null,
  n int not null default 0,
  primary key (user_id, day)
);
alter table public.assistant_usage enable row level security;  -- no policies: nobody reads or writes it directly

create or replace function public.bump_assistant_usage(max_per_day int) returns int
language plpgsql security definer set search_path = public as $$
declare c int;
begin
  if auth.uid() is null then return -1; end if;
  insert into assistant_usage(user_id, day, n) values (auth.uid(), current_date, 1)
    on conflict (user_id, day) do update set n = assistant_usage.n + 1 where assistant_usage.n < max_per_day
    returning n into c;
  return coalesce(c, -1);   -- -1 means the daily limit was reached
end $$;
revoke all on function public.bump_assistant_usage(int) from public, anon;
grant execute on function public.bump_assistant_usage(int) to authenticated;

-- ---------- Brand dashboard: anonymous, aggregated, only for people on the list ----------
create table if not exists public.brand_admins (email text primary key);
alter table public.brand_admins enable row level security;     -- no policies: edit it from the SQL editor
-- Add yourself (and anyone who should see the real dashboard):
--   insert into brand_admins (email) values ('you@example.com');

-- Counts only people whose latest "share anonymous trends" consent is granted.
-- Needs at least 5 such people overall, and every group under 5 people is left out.
create or replace function public.brand_insights() returns json
language plpgsql stable security definer set search_path = public as $$
declare out json;
begin
  if not exists (select 1 from brand_admins where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  with c as (
    select user_id from (
      select distinct on (user_id) user_id, granted from consents
      where purpose = 'brand_insights' order by user_id, created_at desc, id desc
    ) x where granted
  ),
  up as (select u.* from user_products u join c on c.user_id = u.user_id),
  n as (select count(*)::int as n from c)
  select case when (select n from n) < 5 then json_build_object('users', (select n from n), 'enough', false)
  else json_build_object(
    'users', (select n from n),
    'enough', true,
    'sources', coalesce((select json_agg(json_build_object('k', source, 'n', cnt) order by cnt desc)
        from (select source, count(distinct user_id)::int as cnt from up where source is not null group by source having count(distinct user_id) >= 5) s), '[]'::json),
    'reasons', coalesce((select json_agg(json_build_object('k', stopped_reason, 'n', cnt) order by cnt desc)
        from (select stopped_reason, count(distinct user_id)::int as cnt from up where stopped_reason is not null group by stopped_reason having count(distinct user_id) >= 5) s), '[]'::json),
    'retention', coalesce((select json_agg(json_build_object('week', w, 'pct', pct, 'n', nn) order by w)
        from (select w, count(*)::int as nn,
                case when count(*) >= 5 then (count(*) filter (where up.stopped_on is null or up.stopped_on > up.started_on + w * 7))::float / count(*) end as pct
              from generate_series(4, 16, 4) as w join up on up.started_on <= current_date - w * 7 group by w) r), '[]'::json),
    'early_effects', (select json_build_object('pct', case when count(*) >= 5 then avg(has::int) end, 'n', count(*)::int)
        from (select u.user_id,
                exists (select 1 from checkins k where k.user_id = u.user_id and k.day >= u.started_on and k.day < u.started_on + 14
                        and exists (select 1 from unnest(k.effects) e where e <> 'none')) as has
              from (select user_id, min(started_on) as started_on from up where started_on <= current_date - 14 group by user_id) u
              where exists (select 1 from checkins k where k.user_id = u.user_id and k.day >= u.started_on and k.day < u.started_on + 14)) z),
    'noticed', coalesce((select json_agg(json_build_object('week', wk, 'avg', round(a::numeric, 2)) order by wk)
        from (select ((greatest(0, r.week_of - up.started_on) / 14) * 2) as wk, avg(r.noticed) as a
              from ratings r join up on up.user_id = r.user_id and up.product_id = r.product_id
              group by 1 having count(distinct r.user_id) >= 5) q), '[]'::json)
  ) end into out;
  return out;
end $$;
revoke all on function public.brand_insights() from public, anon;
grant execute on function public.brand_insights() to authenticated;
