import { supabase } from '@/services/supabase'
import ApiService from '@/services/api'
import type { Training, TrainingAction, PricingPreview, Discount } from '@/types/traininghub'

const PUBLIC_STATUSES = ['published', 'registration_open', 'registration_closed', 'completed']

export const TrainingsService = {
  async listPublic(opts: { organisationId?: string; categoryId?: string } = {}): Promise<Training[]> {
    let q = supabase.from('trainings').select('*, organisations(slug, name)').in('status', PUBLIC_STATUSES).order('start_date')
    if (opts.organisationId) q = q.eq('organisation_id', opts.organisationId)
    if (opts.categoryId) q = q.eq('category_id', opts.categoryId)
    const { data, error } = await q
    if (error) throw error
    return (data ?? []) as unknown as Training[]
  },

  // slug is only unique per organisation, so lookups always carry the org slug
  async getBySlug(orgSlug: string, slug: string): Promise<Training | null> {
    const { data, error } = await supabase.from('trainings')
      .select('*, organisations!inner(slug, name)').eq('slug', slug).eq('organisations.slug', orgSlug).maybeSingle()
    if (error) throw error
    return data as unknown as Training | null
  },

  async getById(id: string): Promise<Training | null> {
    const { data, error } = await supabase.from('trainings').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return data as Training | null
  },

  async listForOrg(organisationId: string): Promise<Training[]> {
    const { data, error } = await supabase.from('trainings').select('*')
      .eq('organisation_id', organisationId).order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as Training[]
  },

  async create(organisationId: string, input: Partial<Training>): Promise<Training> {
    const { data, error } = await supabase.from('trainings')
      .insert({ ...input, organisation_id: organisationId, status: 'draft' }).select().single()
    if (error) throw error
    return data as Training
  },

  async update(id: string, input: Partial<Training>): Promise<Training> {
    const { data, error } = await supabase.from('trainings').update(input).eq('id', id).select().single()
    if (error) throw error
    return data as Training
  },

  async listDiscounts(trainingId: string): Promise<Discount[]> {
    const { data, error } = await supabase.from('discounts').select('*').eq('training_id', trainingId).order('min_participants')
    if (error) throw error
    return (data ?? []) as Discount[]
  },

  async seatsTaken(trainingId: string): Promise<number> {
    const { data, error } = await supabase.rpc('training_seats_taken', { p_training_id: trainingId })
    if (error) throw error
    return Number(data ?? 0)
  },

  async calculatePricing(trainingId: string, count: number): Promise<PricingPreview> {
    const { data, error } = await supabase.rpc('calculate_pricing', { p_training_id: trainingId, p_count: count })
    if (error) throw error
    return (Array.isArray(data) ? data[0] : data) as PricingPreview
  },

  setStatus(trainingId: string, action: TrainingAction) {
    return ApiService.post<{ training: Training }>('/trainings-set-status', { training_id: trainingId, action })
  },
}
