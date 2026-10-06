-- =====================================================================
-- TrainingHub :: 04 storage (public bucket, org-scoped write access)
-- Upload path convention:  <organisation_id>/<anything>/<file>
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('training-assets', 'training-assets', true, 10485760,
        array['image/png','image/jpeg','image/webp','image/svg+xml','application/pdf'])
on conflict (id) do nothing;

create policy "training assets public read" on storage.objects
  for select using (bucket_id = 'training-assets');

create policy "training assets org insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'training-assets'
    and public.has_org_permission(((storage.foldername(name))[1])::uuid, 'training.update'));

create policy "training assets org update" on storage.objects
  for update to authenticated using (
    bucket_id = 'training-assets'
    and public.has_org_permission(((storage.foldername(name))[1])::uuid, 'training.update'));

create policy "training assets org delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'training-assets'
    and public.has_org_permission(((storage.foldername(name))[1])::uuid, 'training.update'));
