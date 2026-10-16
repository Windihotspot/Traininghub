-- TrainingHub: organisation self-onboarding and safe approval provisioning.
-- Existing organisations/profiles/memberships remain unchanged.

create table if not exists public.organisation_onboarding_applications (
  id uuid primary key default gen_random_uuid(),
  organisation_name text not null check (length(trim(organisation_name)) between 2 and 160),
  organisation_description text,
  contact_email citext not null,
  contact_phone text,
  owner_name text not null check (length(trim(owner_name)) between 2 and 160),
  owner_email citext not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'approved', 'rejected')),
  organisation_id uuid references public.organisations(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  provisioning_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_org_onboarding_status_created
  on public.organisation_onboarding_applications (status, created_at desc);

create index if not exists idx_org_onboarding_owner_email
  on public.organisation_onboarding_applications (lower(owner_email::text));

-- Avoid duplicate active applications for the same owner while still allowing
-- a new application after an earlier one has been rejected or approved.
create unique index if not exists uq_org_onboarding_active_owner_email
  on public.organisation_onboarding_applications (lower(owner_email::text))
  where status in ('pending', 'processing');

 drop trigger if exists trg_org_onboarding_updated on public.organisation_onboarding_applications;
create trigger trg_org_onboarding_updated
  before update on public.organisation_onboarding_applications
  for each row execute function public.set_updated_at();

alter table public.organisation_onboarding_applications enable row level security;
revoke all on public.organisation_onboarding_applications from anon, authenticated;
grant all on public.organisation_onboarding_applications to service_role;

-- This function runs only from a trusted Edge Function using the service role.
-- Organisation creation, owner membership, application status and audit record
-- commit or roll back together as one database transaction.
create or replace function public.approve_organisation_onboarding(
  p_application_id uuid,
  p_reviewer_id uuid,
  p_owner_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  app public.organisation_onboarding_applications%rowtype;
  owner_profile public.profiles%rowtype;
  new_org public.organisations%rowtype;
  base_slug text;
  candidate_slug text;
  suffix integer := 1;
begin
  if p_application_id is null or p_reviewer_id is null or p_owner_user_id is null then
    raise exception 'Application, reviewer and owner are required';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_reviewer_id and platform_role is not null
  ) then
    raise exception 'Reviewer is not a platform admin';
  end if;

  select * into app
  from public.organisation_onboarding_applications
  where id = p_application_id
  for update;

  if not found then raise exception 'Application not found'; end if;

  -- Idempotent retry: never create a second organisation or membership.
  if app.status = 'approved' and app.organisation_id is not null then
    return jsonb_build_object(
      'application_id', app.id,
      'organisation_id', app.organisation_id,
      'status', app.status,
      'already_approved', true
    );
  end if;

  if app.status <> 'pending' and app.status <> 'processing' then
    raise exception 'Application cannot be approved from status %', app.status;
  end if;

  select * into owner_profile
  from public.profiles
  where id = p_owner_user_id
    and lower(email::text) = lower(app.owner_email::text);

  if not found then
    raise exception 'Owner profile does not exist or email does not match application';
  end if;

  update public.organisation_onboarding_applications
  set status = 'processing', provisioning_error = null
  where id = app.id;

  base_slug := public.slugify(app.organisation_name);
  if coalesce(base_slug, '') = '' then
    base_slug := 'organisation-' || left(replace(app.id::text, '-', ''), 8);
  end if;
  candidate_slug := base_slug;

  while exists (select 1 from public.organisations where slug = candidate_slug) loop
    suffix := suffix + 1;
    candidate_slug := base_slug || '-' || suffix::text;
  end loop;

  insert into public.organisations (
    name, slug, description, contact_email, contact_phone, is_active
  ) values (
    trim(app.organisation_name), candidate_slug,
    nullif(trim(coalesce(app.organisation_description, '')), ''),
    app.contact_email, nullif(trim(coalesce(app.contact_phone, '')), ''), true
  ) returning * into new_org;

  insert into public.organisation_members (organisation_id, user_id, role)
  values (new_org.id, owner_profile.id, 'org_owner')
  on conflict (organisation_id, user_id) do update set role = 'org_owner';

  update public.organisation_onboarding_applications
  set status = 'approved',
      organisation_id = new_org.id,
      reviewed_by = p_reviewer_id,
      reviewed_at = now(),
      rejection_reason = null,
      provisioning_error = null
  where id = app.id;

  insert into public.audit_logs (
    organisation_id, actor_id, actor_email, action,
    resource_type, resource_id, metadata
  )
  select new_org.id, reviewer.id, reviewer.email::text,
         'organisation.onboarding.approved',
         'organisation_onboarding_application', app.id::text,
         jsonb_build_object(
           'application_id', app.id,
           'organisation_id', new_org.id,
           'owner_user_id', owner_profile.id,
           'owner_email', app.owner_email::text
         )
  from public.profiles reviewer
  where reviewer.id = p_reviewer_id;

  return jsonb_build_object(
    'application_id', app.id,
    'organisation_id', new_org.id,
    'organisation_slug', new_org.slug,
    'owner_user_id', owner_profile.id,
    'status', 'approved',
    'already_approved', false
  );
end;
$$;

revoke all on function public.approve_organisation_onboarding(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.approve_organisation_onboarding(uuid, uuid, uuid)
  to service_role;
