-- =====================================================================
-- TrainingHub :: 02 permissions seed + business functions
-- =====================================================================

-- ---------- PERMISSIONS ------------------------------------------------
insert into public.permissions (code, description) values
  ('training.view',        'View all trainings of the organisation (incl. drafts)'),
  ('training.create',      'Create trainings'),
  ('training.update',      'Edit trainings, discounts and categories'),
  ('training.publish',     'Publish / open / close / archive trainings'),
  ('training.delete',      'Delete trainings'),
  ('registration.view',    'View registrations, participants and payments summary'),
  ('registration.export',  'Export registrations'),
  ('registration.update',  'Update registration status / notes'),
  ('payment.view',         'View payments'),
  ('payment.refund',       'Refund payments'),
  ('organisation.manage',  'Edit organisation profile'),
  ('user.manage',          'Invite / change / remove organisation members'),
  ('audit.view',           'View audit logs')
on conflict (code) do nothing;

insert into public.role_permissions (role, permission_code)
select 'org_owner', code from public.permissions
on conflict do nothing;

insert into public.role_permissions (role, permission_code)
select 'org_admin', code from public.permissions
where code not in ('payment.refund','organisation.manage')
on conflict do nothing;

insert into public.role_permissions (role, permission_code) values
  ('org_staff','training.view'),
  ('org_staff','registration.view'),
  ('org_staff','registration.export')
on conflict do nothing;

-- ---------- ACCESS HELPERS ---------------------------------------------
create or replace function public.user_has_org_permission(p_user uuid, p_org uuid, p_perm text)
returns boolean language sql stable security definer set search_path = public as $$
  select
    exists (select 1 from public.profiles p
            where p.id = p_user and p.platform_role is not null)
    or exists (select 1
               from public.organisation_members m
               join public.role_permissions rp on rp.role = m.role
               where m.user_id = p_user
                 and m.organisation_id = p_org
                 and rp.permission_code = p_perm)
$$;

create or replace function public.has_org_permission(p_org uuid, p_perm text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.user_has_org_permission(auth.uid(), p_org, p_perm)
$$;

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p
                 where p.id = auth.uid() and p.platform_role is not null)
$$;

create or replace function public.is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organisation_members m
                 where m.user_id = auth.uid() and m.organisation_id = p_org)
$$;

-- now that user_has_org_permission exists, attach the trainings trigger
create trigger trg_trainings_before_write
  before insert or update on public.trainings
  for each row execute function public.trainings_before_write();

-- ---------- SEATS / PRICING --------------------------------------------
-- seats held = confirmed + pending registrations created in the last 2 hours
create or replace function public.training_seats_taken(p_training_id uuid)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce(sum(participant_count), 0)::int
  from public.registrations
  where training_id = p_training_id
    and (status = 'confirmed'
         or (status = 'pending' and created_at > now() - interval '2 hours'))
$$;

create or replace function public.calculate_pricing(p_training_id uuid, p_count integer)
returns table (subtotal numeric, discount_amount numeric, total_amount numeric, discount_id uuid)
language plpgsql stable security definer set search_path = public as $$
declare
  v_fee numeric; v_sub numeric; v_disc numeric; v_did uuid;
begin
  select fee into v_fee from public.trainings where id = p_training_id;
  if v_fee is null then raise exception 'Training not found'; end if;

  v_sub := v_fee * p_count;

  select d.id,
         case when d.type = 'percentage'
              then round(v_sub * d.value / 100, 2)
              else least(d.value, v_sub) end
    into v_did, v_disc
  from public.discounts d
  where d.training_id = p_training_id
    and d.is_active
    and p_count >= d.min_participants
  order by 2 desc
  limit 1;

  v_disc := coalesce(v_disc, 0);
  return query select v_sub, v_disc, v_sub - v_disc, v_did;
end $$;

-- ---------- CREATE REGISTRATION (atomic) --------------------------------
-- p_participants: [{first_name,last_name,email,phone,job_title}, ...]
create or replace function public.create_registration(
  p_training_id   uuid,
  p_type          public.registration_type,
  p_company_name  text,
  p_contact_name  text,
  p_contact_email text,
  p_contact_phone text,
  p_participants  jsonb,
  p_user_id       uuid default null,
  p_provider      text default 'quidly'
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  t public.trainings%rowtype;
  n int;
  pr record;
  v_reg public.registrations%rowtype;
  v_pay public.payments%rowtype;
  v_part_id uuid;
  p jsonb;
begin
  select * into t from public.trainings where id = p_training_id for update;
  if not found then raise exception 'Training not found'; end if;

  if t.status <> 'registration_open' then
    raise exception 'Registration is not open for this training';
  end if;
  if t.registration_open_at is not null and now() < t.registration_open_at then
    raise exception 'Registration has not opened yet';
  end if;
  if t.registration_close_at is not null and now() > t.registration_close_at then
    raise exception 'Registration has closed';
  end if;

  n := coalesce(jsonb_array_length(p_participants), 0);
  if n < 1 then raise exception 'At least one participant is required'; end if;
  if p_type = 'individual' and n <> 1 then
    raise exception 'Individual registration must have exactly one participant';
  end if;
  if p_type = 'corporate' and coalesce(trim(p_company_name), '') = '' then
    raise exception 'Company name is required for corporate registration';
  end if;

  if t.capacity is not null and public.training_seats_taken(t.id) + n > t.capacity then
    raise exception 'Not enough seats available';
  end if;

  -- duplicate participant check
  for p in select * from jsonb_array_elements(p_participants) loop
    if exists (
      select 1
      from public.registration_participants rp
      join public.registrations r on r.id = rp.registration_id
      join public.participants pp on pp.id = rp.participant_id
      where r.training_id = t.id
        and r.status <> 'cancelled'
        and lower(pp.email::text) = lower(p->>'email')
    ) then
      raise exception '% is already registered for this training', p->>'email';
    end if;
  end loop;

  select * into pr from public.calculate_pricing(t.id, n);

  insert into public.registrations (
    organisation_id, training_id, registration_type, company_name,
    contact_name, contact_email, contact_phone, user_id,
    participant_count, subtotal, discount_amount, total_amount, currency, discount_id
  ) values (
    t.organisation_id, t.id, p_type, nullif(trim(p_company_name), ''),
    p_contact_name, p_contact_email, p_contact_phone, p_user_id,
    n, pr.subtotal, pr.discount_amount, pr.total_amount, t.currency, pr.discount_id
  ) returning * into v_reg;

  for p in select * from jsonb_array_elements(p_participants) loop
    insert into public.participants (
      organisation_id, first_name, last_name, email, phone, job_title, company_name
    ) values (
      t.organisation_id, p->>'first_name', p->>'last_name', p->>'email',
      p->>'phone', p->>'job_title', nullif(trim(p_company_name), '')
    ) returning id into v_part_id;

    insert into public.registration_participants (registration_id, participant_id, organisation_id)
    values (v_reg.id, v_part_id, t.organisation_id);
  end loop;

  insert into public.payments (organisation_id, registration_id, reference, provider, amount, currency)
  values (
    t.organisation_id, v_reg.id,
    'PAY-' || upper(encode(gen_random_bytes(6), 'hex')),
    p_provider, v_reg.total_amount, t.currency
  ) returning * into v_pay;

  insert into public.notifications (organisation_id, type, title, body, data)
  values (
    t.organisation_id, 'registration.created', 'New registration',
    format('%s registered %s participant(s) for %s', coalesce(v_reg.company_name, v_reg.contact_name), n, t.title),
    jsonb_build_object('registration_id', v_reg.id, 'training_id', t.id)
  );

  return jsonb_build_object(
    'registration_id',        v_reg.id,
    'registration_reference', v_reg.reference,
    'payment_id',             v_pay.id,
    'payment_reference',      v_pay.reference,
    'organisation_id',        t.organisation_id,
    'training_id',            t.id,
    'participant_count',      n,
    'subtotal',               v_reg.subtotal,
    'discount_amount',        v_reg.discount_amount,
    'total_amount',           v_reg.total_amount,
    'currency',               v_reg.currency
  );
end $$;

-- ---------- PAYMENT STATE (idempotent) -----------------------------------
create or replace function public.mark_payment_paid(
  p_reference text, p_txn_id text default null, p_raw jsonb default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pay public.payments%rowtype; reg public.registrations%rowtype;
begin
  update public.payments
     set status = 'paid',
         paid_at = now(),
         provider_transaction_id = coalesce(p_txn_id, provider_transaction_id),
         raw_response = coalesce(p_raw, raw_response)
   where reference = p_reference and status <> 'paid'
   returning * into pay;

  if not found then
    return jsonb_build_object('changed', false);   -- already paid or unknown
  end if;

  -- a paid registration is always confirmed (even if it was auto-cancelled meanwhile)
  update public.registrations
     set status = 'confirmed'
   where id = pay.registration_id and status in ('pending','cancelled')
   returning * into reg;

  insert into public.notifications (organisation_id, type, title, body, data)
  values (pay.organisation_id, 'payment.paid', 'Payment received',
          format('Payment %s of %s %s confirmed', pay.reference, pay.amount, pay.currency),
          jsonb_build_object('registration_id', pay.registration_id, 'payment_id', pay.id));

  return jsonb_build_object('changed', true, 'registration_id', pay.registration_id,
                            'payment_id', pay.id);
end $$;

create or replace function public.mark_payment_failed(
  p_reference text, p_status public.payment_status default 'failed', p_raw jsonb default null
) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update public.payments
     set status = p_status, raw_response = coalesce(p_raw, raw_response)
   where reference = p_reference and status in ('pending','processing');
  return found;
end $$;

-- cancel registrations that were never paid (run via pg_cron / scheduled function)
create or replace function public.expire_stale_registrations(p_hours integer default 2)
returns integer language plpgsql security definer set search_path = public as $$
declare n int;
begin
  with stale as (
    update public.registrations r
       set status = 'cancelled'
     where r.status = 'pending'
       and r.created_at < now() - make_interval(hours => p_hours)
       and not exists (select 1 from public.payments p
                       where p.registration_id = r.id and p.status = 'paid')
     returning r.id
  )
  update public.payments set status = 'cancelled'
   where registration_id in (select id from stale) and status in ('pending','processing');
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------- DASHBOARD STATS ----------------------------------------------
create or replace function public.org_dashboard_stats(p_org uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_org_permission(p_org, 'registration.view') then
    raise exception 'Forbidden';
  end if;
  return jsonb_build_object(
    'trainings',     (select count(*) from public.trainings where organisation_id = p_org),
    'published',     (select count(*) from public.trainings where organisation_id = p_org
                        and status in ('published','registration_open')),
    'registrations', (select count(*) from public.registrations where organisation_id = p_org),
    'participants',  (select coalesce(sum(participant_count),0) from public.registrations
                        where organisation_id = p_org and status = 'confirmed'),
    'paid',          (select count(*) from public.payments where organisation_id = p_org and status = 'paid'),
    'pending',       (select count(*) from public.payments where organisation_id = p_org and status = 'pending'),
    'revenue',       (select coalesce(sum(amount),0) from public.payments
                        where organisation_id = p_org and status = 'paid')
  );
end $$;

create or replace function public.platform_dashboard_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'Forbidden'; end if;
  return jsonb_build_object(
    'organisations',     (select count(*) from public.organisations),
    'published_trainings',(select count(*) from public.trainings
                             where status in ('published','registration_open')),
    'registrations',     (select count(*) from public.registrations),
    'successful_payments',(select count(*) from public.payments where status = 'paid'),
    'pending_payments',  (select count(*) from public.payments where status = 'pending'),
    'revenue',           (select coalesce(sum(amount),0) from public.payments where status = 'paid')
  );
end $$;

-- ---------- FUNCTION PRIVILEGES -------------------------------------------
revoke all on function public.create_registration(uuid, public.registration_type, text, text, text, text, jsonb, uuid, text) from public, anon, authenticated;
revoke all on function public.mark_payment_paid(text, text, jsonb)   from public, anon, authenticated;
revoke all on function public.mark_payment_failed(text, public.payment_status, jsonb) from public, anon, authenticated;
revoke all on function public.expire_stale_registrations(integer)    from public, anon, authenticated;
revoke all on function public.user_has_org_permission(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.create_registration(uuid, public.registration_type, text, text, text, text, jsonb, uuid, text) to service_role;
grant execute on function public.mark_payment_paid(text, text, jsonb)   to service_role;
grant execute on function public.mark_payment_failed(text, public.payment_status, jsonb) to service_role;
grant execute on function public.expire_stale_registrations(integer)    to service_role;
grant execute on function public.user_has_org_permission(uuid, uuid, text) to service_role;

-- price preview is safe for the public
grant execute on function public.calculate_pricing(uuid, integer) to anon, authenticated;
grant execute on function public.training_seats_taken(uuid)       to anon, authenticated;

-- ---------- OPTIONAL: cron to expire unpaid registrations -----------------
-- create extension if not exists pg_cron;
-- select cron.schedule('expire-stale-registrations', '*/15 * * * *',
--                      $$select public.expire_stale_registrations(2)$$);
