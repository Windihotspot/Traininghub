-- =====================================================================
-- TrainingHub :: 01 schema (enums, tables, indexes, base triggers)
-- =====================================================================
create extension if not exists pgcrypto;
create extension if not exists citext;

-- ---------- ENUMS ----------------------------------------------------
create type public.platform_role as enum ('super_admin', 'platform_admin');
create type public.org_role as enum ('org_owner', 'org_admin', 'org_staff');
create type public.training_status as enum
  ('draft','published','registration_open','registration_closed','completed','archived');
create type public.delivery_mode as enum ('virtual','physical','hybrid');
create type public.registration_type as enum ('individual','corporate');
create type public.registration_status as enum ('pending','confirmed','cancelled','waitlisted');
create type public.payment_status as enum
  ('pending','processing','paid','failed','cancelled','refunded');
create type public.discount_type as enum ('percentage','fixed');

-- ---------- GENERIC TRIGGERS -----------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function public.slugify(txt text)
returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(lower(coalesce(txt,'')), '[^a-z0-9]+', '-', 'g'))
$$;

-- ---------- ORGANISATIONS --------------------------------------------
create table public.organisations (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  description   text,
  logo_url      text,
  website       text,
  contact_email citext,
  contact_phone text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_organisations_updated before update on public.organisations
  for each row execute function public.set_updated_at();

-- ---------- PROFILES (1:1 with auth.users) ----------------------------
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         citext,
  full_name     text,
  phone         text,
  platform_role public.platform_role,          -- null for normal users
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on public.profiles (email);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- auto-create profile on signup / invite
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- ORG MEMBERS / ROLES / PERMISSIONS --------------------------
create table public.organisation_members (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  role            public.org_role not null default 'org_staff',
  created_at      timestamptz not null default now(),
  unique (organisation_id, user_id)
);
create index on public.organisation_members (user_id);

create table public.permissions (
  code        text primary key,
  description text
);

create table public.role_permissions (
  role            public.org_role not null,
  permission_code text not null references public.permissions(code) on delete cascade,
  primary key (role, permission_code)
);

-- ---------- CATEGORIES -------------------------------------------------
create table public.training_categories (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid references public.organisations(id) on delete cascade, -- null = global
  name            text not null,
  slug            text not null,
  created_at      timestamptz not null default now()
);
create unique index training_categories_scope_slug
  on public.training_categories (coalesce(organisation_id, '00000000-0000-0000-0000-000000000000'::uuid), slug);

-- ---------- TRAININGS --------------------------------------------------
create table public.trainings (
  id                  uuid primary key default gen_random_uuid(),
  organisation_id     uuid not null references public.organisations(id) on delete cascade,
  category_id         uuid references public.training_categories(id) on delete set null,

  title               text not null,
  slug                text not null,
  short_description   text,
  -- structured content (never one giant blob)
  overview            text,
  who_should_attend   text,
  learning_objectives text,
  course_outline      text,
  requirements        text,

  start_date          date,
  end_date            date,
  start_time          time,
  end_time            time,
  timezone            text not null default 'Africa/Lagos',

  delivery_mode       public.delivery_mode not null default 'virtual',
  location            text,
  meeting_url         text,

  fee                 numeric(14,2) not null default 0 check (fee >= 0),
  currency            text not null default 'NGN',
  capacity            integer check (capacity is null or capacity > 0),

  registration_open_at  timestamptz,
  registration_close_at timestamptz,

  status              public.training_status not null default 'draft',
  featured            boolean not null default false,
  cover_image         text,
  brochure_url        text,

  created_by          uuid default auth.uid() references public.profiles(id) on delete set null,
  updated_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  unique (organisation_id, slug),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create index on public.trainings (organisation_id, status);
create index on public.trainings (status, start_date);
create index on public.trainings (category_id);
create index trainings_title_search on public.trainings
  using gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(short_description,'')));

create or replace function public.trainings_before_write()
returns trigger language plpgsql security definer set search_path = public as $$
declare base text; candidate text; n int := 1;
begin
  new.updated_at = now();
  if auth.uid() is not null then new.updated_by = auth.uid(); end if;

  if tg_op = 'INSERT' and (new.slug is null or new.slug = '') then
    base := public.slugify(new.title);
    candidate := base;
    while exists (select 1 from public.trainings
                  where organisation_id = new.organisation_id and slug = candidate) loop
      n := n + 1; candidate := base || '-' || n;
    end loop;
    new.slug := candidate;
  end if;

  if tg_op = 'UPDATE' and new.organisation_id <> old.organisation_id then
    raise exception 'organisation_id cannot be changed';
  end if;

  -- status changes by logged-in clients require training.publish
  if tg_op = 'UPDATE' and new.status <> old.status and auth.uid() is not null then
    if not public.user_has_org_permission(auth.uid(), new.organisation_id, 'training.publish') then
      raise exception 'Not allowed to change training status';
    end if;
  end if;
  return new;
end $$;
-- NOTE: trigger is created in migration 02 (after user_has_org_permission exists)

-- ---------- DISCOUNT RULES ---------------------------------------------
-- percentage: value = % off subtotal. fixed: value = amount off the whole registration.
create table public.discounts (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  training_id      uuid not null references public.trainings(id) on delete cascade,
  name             text not null default 'Group discount',
  min_participants integer not null default 4 check (min_participants >= 2),
  type             public.discount_type not null default 'percentage',
  value            numeric(14,2) not null check (value > 0),
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  check (type <> 'percentage' or value <= 100)
);
create index on public.discounts (training_id);

-- ---------- PARTICIPANTS / REGISTRATIONS --------------------------------
create table public.participants (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id         uuid references public.profiles(id) on delete set null,
  first_name      text not null,
  last_name       text not null,
  email           citext not null,
  phone           text,
  job_title       text,
  company_name    text,
  created_at      timestamptz not null default now()
);
create index on public.participants (organisation_id, email);

create sequence public.registration_ref_seq start 1;

create table public.registrations (
  id                uuid primary key default gen_random_uuid(),
  organisation_id   uuid not null references public.organisations(id) on delete cascade,
  training_id       uuid not null references public.trainings(id) on delete restrict,
  reference         text not null unique
                    default ('REG-' || lpad(nextval('public.registration_ref_seq')::text, 6, '0')),
  registration_type public.registration_type not null default 'individual',
  company_name      text,
  contact_name      text not null,
  contact_email     citext not null,
  contact_phone     text,
  user_id           uuid references public.profiles(id) on delete set null,
  status            public.registration_status not null default 'pending',
  participant_count integer not null check (participant_count > 0),
  subtotal          numeric(14,2) not null default 0,
  discount_amount   numeric(14,2) not null default 0,
  total_amount      numeric(14,2) not null default 0,
  currency          text not null default 'NGN',
  discount_id       uuid references public.discounts(id) on delete set null,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index on public.registrations (organisation_id, status);
create index on public.registrations (training_id, status);
create index on public.registrations (contact_email);
create index on public.registrations (user_id);
create trigger trg_registrations_updated before update on public.registrations
  for each row execute function public.set_updated_at();

create table public.registration_participants (
  id              uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.registrations(id) on delete cascade,
  participant_id  uuid not null references public.participants(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  attended        boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (registration_id, participant_id)
);
create index on public.registration_participants (participant_id);

-- ---------- PAYMENTS ----------------------------------------------------
create table public.payments (
  id                      uuid primary key default gen_random_uuid(),
  organisation_id         uuid not null references public.organisations(id) on delete cascade,
  registration_id         uuid not null references public.registrations(id) on delete cascade,
  reference               text not null unique,
  provider                text not null default 'quidly',
  amount                  numeric(14,2) not null check (amount >= 0),
  currency                text not null default 'NGN',
  status                  public.payment_status not null default 'pending',
  provider_transaction_id text,
  checkout_url            text,
  raw_response            jsonb,
  paid_at                 timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index on public.payments (registration_id);
create index on public.payments (organisation_id, status);
create trigger trg_payments_updated before update on public.payments
  for each row execute function public.set_updated_at();

-- every provider event / verification attempt is logged here
create table public.payment_transactions (
  id         uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments(id) on delete cascade,
  event_type text not null,
  status     text,
  payload    jsonb,
  created_at timestamptz not null default now()
);
create index on public.payment_transactions (payment_id);

-- ---------- NOTIFICATIONS / AUDIT ---------------------------------------
create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  organisation_id uuid references public.organisations(id) on delete cascade,
  user_id         uuid references public.profiles(id) on delete cascade,
  type            text not null,
  title           text not null,
  body            text,
  data            jsonb not null default '{}'::jsonb,
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index on public.notifications (organisation_id, created_at desc);

create table public.audit_logs (
  id              bigint generated always as identity primary key,
  organisation_id uuid references public.organisations(id) on delete set null,
  actor_id        uuid,
  actor_email     text,
  action          text not null,
  resource_type   text,
  resource_id     text,
  metadata        jsonb not null default '{}'::jsonb,
  ip_address      text,
  created_at      timestamptz not null default now()
);
create index on public.audit_logs (organisation_id, created_at desc);
create index on public.audit_logs (actor_id);
