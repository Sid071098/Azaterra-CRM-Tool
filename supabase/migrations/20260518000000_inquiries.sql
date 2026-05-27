-- Azaterra CRM — initial schema for inquiries + RBAC
-- Run this in your Supabase project: Database → SQL editor, paste, run.
-- Or via the Supabase CLI: `supabase db push`.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. PROFILES (extends auth.users with a role)
-- ────────────────────────────────────────────────────────────────────────────
create type public.user_role as enum ('Owner', 'SalesRep');

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        public.user_role not null default 'SalesRep',
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Everyone authenticated can read profiles (needed to render assigned rep names)
create policy "profiles are readable by authenticated"
  on public.profiles for select
  to authenticated
  using (true);

-- A user can update their own profile (but not change role — owners do that)
create policy "users can update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ────────────────────────────────────────────────────────────────────────────
-- 2. INQUIRIES
-- ────────────────────────────────────────────────────────────────────────────
create type public.customer_type as enum ('Distributor', 'Retailer', 'Farmer', 'Other');
create type public.inquiry_stage as enum ('New', 'Contacted', 'Quotation', 'Closed Won', 'Closed Lost');
create type public.quantity_unit as enum ('L', 'Kg', 'Bags', 'Tonnes');

create table if not exists public.inquiries (
  id                          uuid primary key default gen_random_uuid(),
  company_name                text not null,
  contact_name                text not null,
  email                       text,
  phone_whatsapp              text,
  country                     text not null,
  city_region                 text,
  customer_type               public.customer_type,
  inquiry_source              text,
  assigned_sales_rep_id       uuid references public.profiles(id) on delete set null,
  product_name                text not null default 'Neem Oil (Cold Press)',
  product_notes_spec          text,
  quantity                    numeric,
  unit                        public.quantity_unit,
  packaging                   text,
  stage                       public.inquiry_stage not null default 'New',
  estimated_value             numeric,
  currency                    text not null default 'INR',
  expected_close_date         date,
  next_action_date            date,
  next_action_note            text,
  general_notes               text,
  regulatory_compliance_notes text,
  created_by                  uuid references public.profiles(id) on delete set null,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);

create index inquiries_assigned_idx on public.inquiries(assigned_sales_rep_id);
create index inquiries_stage_idx on public.inquiries(stage);
create index inquiries_created_at_idx on public.inquiries(created_at desc);

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
create trigger inquiries_touch_updated_at
  before update on public.inquiries
  for each row execute function public.touch_updated_at();

alter table public.inquiries enable row level security;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. RLS POLICIES
-- ────────────────────────────────────────────────────────────────────────────
-- Owners: full read/write across the org.
-- Sales Reps: can SELECT only inquiries assigned to or created by them, can INSERT (the form auto-stamps their UUID), can UPDATE their own rows.

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'Owner');
$$;

create policy "owners read all inquiries"
  on public.inquiries for select
  to authenticated
  using (public.is_owner());

create policy "reps read own inquiries"
  on public.inquiries for select
  to authenticated
  using (
    assigned_sales_rep_id = auth.uid() or created_by = auth.uid()
  );

create policy "owners insert inquiries"
  on public.inquiries for insert
  to authenticated
  with check (public.is_owner());

create policy "reps insert their own inquiries"
  on public.inquiries for insert
  to authenticated
  with check (
    created_by = auth.uid() and (assigned_sales_rep_id is null or assigned_sales_rep_id = auth.uid())
  );

create policy "owners update any inquiry"
  on public.inquiries for update
  to authenticated
  using (public.is_owner())
  with check (public.is_owner());

create policy "reps update their own inquiries"
  on public.inquiries for update
  to authenticated
  using (created_by = auth.uid() or assigned_sales_rep_id = auth.uid())
  with check (created_by = auth.uid() or assigned_sales_rep_id = auth.uid());

create policy "only owners delete inquiries"
  on public.inquiries for delete
  to authenticated
  using (public.is_owner());

-- ────────────────────────────────────────────────────────────────────────────
-- 4. SEED: promote your first user to Owner manually after signup, e.g.:
--   update public.profiles set role = 'Owner' where id = '<your-auth-uid>';
-- ────────────────────────────────────────────────────────────────────────────
