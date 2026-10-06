-- =====================================================================
-- TrainingHub :: 03 Row Level Security
-- Writes that need server-side logic (registrations, payments, members)
-- go through edge functions using the service role (bypasses RLS).
-- =====================================================================
alter table public.organisations              enable row level security;
alter table public.profiles                   enable row level security;
alter table public.organisation_members       enable row level security;
alter table public.permissions                enable row level security;
alter table public.role_permissions           enable row level security;
alter table public.training_categories        enable row level security;
alter table public.trainings                  enable row level security;
alter table public.discounts                  enable row level security;
alter table public.participants               enable row level security;
alter table public.registrations              enable row level security;
alter table public.registration_participants  enable row level security;
alter table public.payments                   enable row level security;
alter table public.payment_transactions       enable row level security;
alter table public.notifications              enable row level security;
alter table public.audit_logs                 enable row level security;

-- ---------- organisations ------------------------------------------------
create policy org_public_read on public.organisations
  for select to anon, authenticated using (is_active);
create policy org_member_read on public.organisations
  for select to authenticated using (public.is_org_member(id) or public.is_platform_admin());
create policy org_update on public.organisations
  for update to authenticated
  using (public.has_org_permission(id, 'organisation.manage'))
  with check (public.has_org_permission(id, 'organisation.manage'));
-- inserts / deletes: platform admins via edge function only
revoke update on public.organisations from authenticated;
grant  update (name, description, logo_url, website, contact_email, contact_phone)
  on public.organisations to authenticated;

-- ---------- profiles -------------------------------------------------------
create policy profile_self_read on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_platform_admin());
create policy profile_org_read on public.profiles
  for select to authenticated using (
    exists (select 1 from public.organisation_members me
            join public.organisation_members other on other.organisation_id = me.organisation_id
            where me.user_id = auth.uid() and other.user_id = profiles.id
              and public.has_org_permission(me.organisation_id, 'user.manage'))
  );
create policy profile_self_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant  update (full_name, phone) on public.profiles to authenticated;

-- ---------- organisation_members --------------------------------------------
create policy members_read on public.organisation_members
  for select to authenticated using (
    user_id = auth.uid() or public.is_org_member(organisation_id) or public.is_platform_admin());

-- ---------- permissions --------------------------------------------------------
create policy perms_read on public.permissions      for select to authenticated using (true);
create policy role_perms_read on public.role_permissions for select to authenticated using (true);

-- ---------- categories ---------------------------------------------------------
create policy cat_public_read on public.training_categories
  for select to anon, authenticated using (true);
create policy cat_write on public.training_categories
  for all to authenticated
  using (organisation_id is not null and public.has_org_permission(organisation_id, 'training.update'))
  with check (organisation_id is not null and public.has_org_permission(organisation_id, 'training.update'));

-- ---------- trainings -----------------------------------------------------------
create policy training_public_read on public.trainings
  for select to anon, authenticated using (
    status in ('published','registration_open','registration_closed','completed')
    and exists (select 1 from public.organisations o where o.id = organisation_id and o.is_active));
create policy training_member_read on public.trainings
  for select to authenticated using (public.has_org_permission(organisation_id, 'training.view'));
create policy training_insert on public.trainings
  for insert to authenticated with check (
    public.has_org_permission(organisation_id, 'training.create') and status = 'draft');
create policy training_update on public.trainings
  for update to authenticated
  using (public.has_org_permission(organisation_id, 'training.update'))
  with check (public.has_org_permission(organisation_id, 'training.update'));
create policy training_delete on public.trainings
  for delete to authenticated using (
    public.has_org_permission(organisation_id, 'training.delete')
    and not exists (select 1 from public.registrations r where r.training_id = trainings.id));

-- ---------- discounts -------------------------------------------------------------
create policy discount_public_read on public.discounts
  for select to anon, authenticated using (
    is_active and exists (select 1 from public.trainings t where t.id = training_id
      and t.status in ('published','registration_open')));
create policy discount_member_all on public.discounts
  for all to authenticated
  using (public.has_org_permission(organisation_id, 'training.update'))
  with check (public.has_org_permission(organisation_id, 'training.update')
    and exists (select 1 from public.trainings t
                where t.id = training_id and t.organisation_id = discounts.organisation_id));

-- ---------- participants / registrations ---------------------------------------------
create policy participants_read on public.participants
  for select to authenticated using (
    public.has_org_permission(organisation_id, 'registration.view') or user_id = auth.uid());

create policy registrations_read on public.registrations
  for select to authenticated using (
    public.has_org_permission(organisation_id, 'registration.view') or user_id = auth.uid());
create policy registrations_update on public.registrations
  for update to authenticated
  using (public.has_org_permission(organisation_id, 'registration.update'))
  with check (public.has_org_permission(organisation_id, 'registration.update'));
revoke update on public.registrations from authenticated;
grant  update (status, notes) on public.registrations to authenticated;

create policy reg_participants_read on public.registration_participants
  for select to authenticated using (
    public.has_org_permission(organisation_id, 'registration.view')
    or exists (select 1 from public.registrations r
               where r.id = registration_id and r.user_id = auth.uid()));
create policy reg_participants_update on public.registration_participants
  for update to authenticated
  using (public.has_org_permission(organisation_id, 'registration.update'))
  with check (public.has_org_permission(organisation_id, 'registration.update'));
revoke update on public.registration_participants from authenticated;
grant  update (attended) on public.registration_participants to authenticated;

-- ---------- payments (read-only for clients) ----------------------------------------
create policy payments_read on public.payments
  for select to authenticated using (
    public.has_org_permission(organisation_id, 'payment.view')
    or exists (select 1 from public.registrations r
               where r.id = registration_id and r.user_id = auth.uid()));
create policy payment_tx_read on public.payment_transactions
  for select to authenticated using (
    exists (select 1 from public.payments p
            where p.id = payment_id and public.has_org_permission(p.organisation_id, 'payment.view')));

-- ---------- notifications --------------------------------------------------------------
create policy notif_read on public.notifications
  for select to authenticated using (
    user_id = auth.uid()
    or (organisation_id is not null and public.has_org_permission(organisation_id, 'registration.view')));
create policy notif_mark_read on public.notifications
  for update to authenticated
  using (user_id = auth.uid()
         or (organisation_id is not null and public.has_org_permission(organisation_id, 'registration.view')))
  with check (true);
revoke update on public.notifications from authenticated;
grant  update (read_at) on public.notifications to authenticated;

-- ---------- audit logs ---------------------------------------------------------------------
create policy audit_read on public.audit_logs
  for select to authenticated using (
    public.is_platform_admin()
    or (organisation_id is not null and public.has_org_permission(organisation_id, 'audit.view')));

-- ---------- hard privilege trims -------------------------------------------------------------
revoke insert, delete on public.registrations, public.registration_participants,
  public.participants, public.payments, public.payment_transactions,
  public.audit_logs, public.organisation_members, public.organisations,
  public.profiles, public.notifications from anon, authenticated;
revoke all on public.payments, public.payment_transactions, public.audit_logs,
  public.registrations, public.registration_participants, public.participants,
  public.organisation_members, public.notifications from anon;
