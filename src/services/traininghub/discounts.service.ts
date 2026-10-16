import { supabase } from '@/services/supabase'
import type { Discount } from '@/types/traininghub'

export type DiscountInput = Pick<Discount, 'name' | 'min_participants' | 'type' | 'value'>

export const DiscountsService = {
  async create(organisationId: string, trainingId: string, input: DiscountInput): Promise<Discount> {
    const { data, error } = await supabase.from('discounts')
      .insert({ ...input, organisation_id: organisationId, training_id: trainingId }).select().single()
    if (error) throw error
    return data as Discount
  },
  async setActive(id: string, is_active: boolean) {
    const { data, error } = await supabase.from('discounts').update({ is_active }).eq('id', id).select('id')
    if (error) throw error
    if (!data?.length) throw new Error("You don't have permission to change this discount.")
  },
  async remove(id: string) {
    const { data, error } = await supabase.from('discounts').delete().eq('id', id).select('id')
    if (error) throw error
    if (!data?.length) throw new Error("You don't have permission to delete this discount.")
  },
}
