-- Man Matters Companion (concept, unofficial) - Phase 1 schema. Run in Supabase SQL editor.
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  language text not null default 'en' check (language in ('en','hi','bn')),
  concerns text[] not null default '{}',
  goal_note text,
  is_student boolean not null default false,
  onboarded_at timestamptz,
  created_at timestamptz not null default now()
);
-- Purpose-specific DPDP consent. Append-only: each grant or withdrawal is a new row.
create table public.consents (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  purpose text not null check (purpose in ('account','progress_tracking','photo_storage','ai_assistant','offers_marketing','brand_insights')),
  granted boolean not null,
  notice_version text not null default 'v1',
  created_at timestamptz not null default now()
);
create index on public.consents (user_id, purpose, created_at desc);
create table public.products (
  id text primary key, name text not null, category text not null,
  typical_weeks_to_notice int, usage_note text, price_inr int
);
insert into public.products values
 ('minoxidil-hair','Hair regrowth solution (concept)','hair',16,'Follow the pack label. Ask a doctor about irritation.',null),
 ('minoxidil-beard','Beard growth solution (concept)','beard',16,'Follow the pack label. Ask a doctor about irritation.',null),
 ('hair-gummies','Hair gummies (concept)','supplement',12,'Take as per pack label.',null),
 ('anti-dandruff-shampoo','Anti-dandruff shampoo (concept)','hair',4,'Follow the pack label.',null);
create table public.user_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  product_id text not null references public.products,
  started_on date not null default current_date,
  source text default 'amazon',
  active boolean not null default true
);
alter table public.profiles enable row level security;
alter table public.consents enable row level security;
alter table public.user_products enable row level security;
alter table public.products enable row level security;
create policy own_profile on public.profiles for all using (auth.uid()=id) with check (auth.uid()=id);
create policy own_consents_read on public.consents for select using (auth.uid()=user_id);
create policy own_consents_add on public.consents for insert with check (auth.uid()=user_id);
create policy own_user_products on public.user_products for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy products_public on public.products for select using (true);
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id) values (new.id); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
