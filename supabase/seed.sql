-- =====================================================================
-- Dev seed: NGX X-Academy + sample trainings
-- Dates other than the first training are PLACEHOLDERS - replace with real ones.
-- =====================================================================
insert into public.organisations (id, name, slug, description, contact_email)
values ('11111111-1111-1111-1111-111111111111', 'NGX X-Academy', 'ngx',
        'Professional capital-market and finance training from NGX.', 'training@example.com')
on conflict (id) do nothing;

insert into public.training_categories (organisation_id, name, slug) values
  (null, 'Investment', 'investment'),
  (null, 'Risk Management', 'risk-management'),
  (null, 'Compliance', 'compliance'),
  (null, 'Leadership', 'leadership'),
  (null, 'Corporate Governance', 'corporate-governance'),
  (null, 'Finance', 'finance'),
  (null, 'Capital Markets', 'capital-markets'),
  (null, 'Technology', 'technology'),
  (null, 'ESG', 'esg'),
  (null, 'Procurement', 'procurement')
on conflict do nothing;

with cat as (select slug, id from public.training_categories where organisation_id is null)
insert into public.trainings
  (organisation_id, category_id, title, slug, short_description,
   start_date, end_date, start_time, end_time, delivery_mode, fee, capacity, status)
values
 ('11111111-1111-1111-1111-111111111111', (select id from cat where slug='investment'),
  'Investment & Portfolio Management Analysis: Fund Management Risk Modelling and Trusts as Investment Options',
  'investment-portfolio-management-analysis',
  'Fund management, risk modelling and trusts as investment options.',
  '2026-10-06','2026-10-07','10:00','16:00','virtual',220000,50,'registration_open'),
 ('11111111-1111-1111-1111-111111111111', (select id from cat where slug='compliance'),
  'Compliance & Enterprise Risk Management', 'compliance-enterprise-risk-management',
  'Placeholder date.', '2026-10-20','2026-10-21','10:00','16:00','virtual',220000,50,'registration_open'),
 ('11111111-1111-1111-1111-111111111111', (select id from cat where slug='capital-markets'),
  'Advanced Derivatives Contracts', 'advanced-derivatives-contracts',
  'Placeholder date.', '2026-11-10','2026-11-11','10:00','16:00','physical',250000,40,'published'),
 ('11111111-1111-1111-1111-111111111111', (select id from cat where slug='technology'),
  'Certificate in Ethical Artificial Intelligence', 'certificate-in-ethical-ai',
  'Placeholder date.', '2026-12-01','2026-12-02','10:00','16:00','hybrid',200000,60,'draft')
on conflict do nothing;

-- 10% off for 4+ participants on every seeded training
insert into public.discounts (organisation_id, training_id, name, min_participants, type, value)
select organisation_id, id, 'Corporate discount (4+)', 4, 'percentage', 10
from public.trainings where organisation_id = '11111111-1111-1111-1111-111111111111'
on conflict do nothing;
