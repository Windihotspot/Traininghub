# TrainingHub - Supabase backend

Multi-tenant training platform: organisations (NGX X-Academy first) publish trainings, people register
(individual or corporate) and pay, org admins manage registrations, platform admins manage everything.

## Layout
```
supabase/
  config.toml                      # merge the [functions.*] blocks into yours
  seed.sql                         # NGX X-Academy + sample trainings (dev)
  migrations/
    ..01_schema.sql                # enums, tables, indexes, triggers, profile-on-signup
    ..02_functions.sql             # permissions seed, access helpers, pricing, create_registration,
                                   # mark_payment_paid/failed, stats RPCs
    ..03_rls.sql                   # row level security + column-level grants
    ..04_storage.sql               # training-assets bucket (path: <organisation_id>/...)
  functions/
    _shared/  handler.ts auth.ts audit.ts email.ts notifications.ts payments/{types,quidly,index}.ts
              (+ your existing cors.ts and supabaseAdmin.ts - assumed file names)
    registrations-create  payments-initialize  payments-verify  payments-webhook
    trainings-set-status  registrations-export org-members-manage admin-create-organisation
```

## Setup
```bash
supabase link --project-ref <ref>
supabase db push                      # runs the 4 migrations
psql "$DB_URL" -f supabase/seed.sql   # optional dev data
supabase secrets set --env-file supabase/functions/.env.example
supabase functions deploy registrations-create payments-initialize payments-verify \
  payments-webhook trainings-set-status registrations-export org-members-manage admin-create-organisation
```
Auth: enable Email provider in the dashboard, set Site URL / redirect URLs to your app origins
(`http://localhost:3001`, `https://www.wealthoceanstech.com`).

### First platform admin
Sign up normally, then in the SQL editor:
```sql
update public.profiles set platform_role = 'super_admin' where email = 'you@example.com';
```
Then call `admin-create-organisation` to onboard orgs (or attach NGX's owner to the seeded org:
`insert into organisation_members (organisation_id, user_id, role) values ('11111111-1111-1111-1111-111111111111', '<uid>', 'org_owner');`).

## Who does what
| Operation | Path |
|---|---|
| Browse trainings / orgs / categories / discounts | direct `supabase.from()` (RLS: public sees published+) |
| Price preview | `supabase.rpc('calculate_pricing', {p_training_id, p_count})` |
| Create / edit training (draft), discounts, categories | direct `supabase.from()` (RLS + permissions) |
| Publish / open / close / complete / archive | `trainings-set-status` |
| Register | `registrations-create` -> returns `payment.checkout_url` |
| Payment callback page | `payments-verify?reference=` |
| Resume unpaid payment | `payments-initialize` |
| Provider -> us | `payments-webhook` (signature + provider re-verify + amount check) |
| Registrations / participants / payments lists | direct `supabase.from()` (RLS, needs `registration.view` / `payment.view`) |
| Export | `registrations-export?organisation_id=...` (CSV) |
| Dashboards | `rpc('org_dashboard_stats', {p_org})`, `rpc('platform_dashboard_stats')` |
| Members | `org-members-manage` |

Frontend call example (your ApiService already attaches the JWT):
```js
const { data } = await supabase.functions.invoke('registrations-create', { body: {...} })
window.location.href = data.payment.checkout_url
```

## Things you must check / know
1. **Quidly adapter** (`_shared/payments/quidly.ts`): endpoints, field names, status values and the webhook
   signature scheme (HMAC-SHA512 of raw body in `x-quidly-signature`) are assumptions. Adjust to the real API.
2. **Tenant security**: edge functions derive access via `user_has_org_permission(user, org, perm)`;
   RLS does the same for direct queries. Never trust `organisation_id` from the client alone.
3. **Seat holds**: pending registrations hold seats for 2h (`training_seats_taken`). Schedule
   `expire_stale_registrations` (pg_cron snippet at the bottom of migration 02).
4. **Fixed discounts** are amount-off the whole registration; percentage is off the subtotal. Best applicable rule wins.
5. Seed dates for trainings 2-4 are placeholders.
6. Excel: export is CSV (opens in Excel). Generate .xlsx client-side with SheetJS if needed.
7. Not included yet (phase 2+): refunds, certificates, attendance UI, SMS, waitlist promotion.
