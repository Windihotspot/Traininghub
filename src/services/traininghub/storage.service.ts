import { supabase } from '@/services/supabase'

const BUCKET = 'training-assets'
const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'] // svg deliberately excluded (public bucket)

// Path convention required by the storage policies: <organisation_id>/<folder>/<file>
export async function uploadAsset(organisationId: string, folder: string, file: File): Promise<string> {
  if (!ALLOWED.includes(file.type)) throw new Error('Only PNG, JPEG, WebP or PDF files are allowed.')
  if (file.size > MAX_BYTES) throw new Error('File must be 10 MB or smaller.')
  const ext = (file.name.split('.').pop() ?? 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${organisationId}/${folder}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}
