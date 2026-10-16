import { supabase } from '@/services/supabase'
import { slugify } from '@/utils/format'
import type { Category } from '@/types/traininghub'

export const CategoriesService = {
  // global (organisation_id null) + this organisation's own
  async list(organisationId: string): Promise<Category[]> {
    const { data, error } = await supabase.from('training_categories').select('*')
      .or(`organisation_id.is.null,organisation_id.eq.${organisationId}`).order('name')
    if (error) throw error
    return (data ?? []) as Category[]
  },
  async create(organisationId: string, name: string): Promise<Category> {
    const { data, error } = await supabase.from('training_categories')
      .insert({ organisation_id: organisationId, name: name.trim(), slug: slugify(name) }).select().single()
    if (error) throw error
    return data as Category
  },
  async remove(id: string) {
    const { data, error } = await supabase.from('training_categories').delete().eq('id', id).select('id')
    if (error) throw error
    if (!data?.length) throw new Error("You don't have permission to delete this category.")
  },
}
