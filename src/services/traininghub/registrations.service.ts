import ApiService from '@/services/api'
import { supabase } from '@/services/supabase'
import type {
  CreateRegistrationPayload,
  CreateRegistrationResponse,
  PaymentVerifyResponse,
  PaymentInitializeResponse,
  ExportFilters,
  RegistrationRow,
  PaymentRow
} from '@/types/traininghub'

// RLS silently filters rows a user can't change, so an empty result means "not allowed".
const affected = (rows: unknown[] | null) => {
  if (!rows?.length) throw new Error("You don't have permission to change this record.")
}

export const RegistrationsService = {
  create: (payload: CreateRegistrationPayload) =>
    ApiService.post<CreateRegistrationResponse>('/registrations-create', payload),

 verifyPayment: (reference: string, quidly_ref?: string) =>
  ApiService.get<PaymentVerifyResponse>('/payments-verify', {
    params: { reference, ...(quidly_ref ? { quidly_ref } : {}) },
  }),

  // Server issues a NEW payment reference per attempt and checks the email (anti-enumeration).
  resumePayment: (registration_reference: string, contact_email: string) =>
    ApiService.post<PaymentInitializeResponse>('/payments-initialize', {
      registration_reference,
      contact_email
    }),

  async listForOrg(organisationId: string): Promise<RegistrationRow[]> {
    const { data, error } = await supabase
      .from('registrations')
      .select(
        `
        id, reference, status, registration_type, company_name, contact_name, contact_email,
        participant_count, total_amount, currency, notes, created_at,
        trainings(title), payments(reference, status, paid_at),
        registration_participants(id, attended, participants(first_name, last_name, email, phone, job_title))`
      )
      .eq('organisation_id', organisationId)
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) throw error
    return (data ?? []) as unknown as RegistrationRow[]
  },

  async updateStatus(id: string, status: 'pending' | 'confirmed' | 'cancelled' | 'waitlisted') {
    const { data, error } = await supabase
      .from('registrations')
      .update({ status })
      .eq('id', id)
      .select('id')
    if (error) throw error
    affected(data)
  },

  async updateNotes(id: string, notes: string) {
    const { data, error } = await supabase
      .from('registrations')
      .update({ notes: notes.trim() || null })
      .eq('id', id)
      .select('id')
    if (error) throw error
    affected(data)
  },

  async setAttended(registrationParticipantId: string, attended: boolean) {
    const { data, error } = await supabase
      .from('registration_participants')
      .update({ attended })
      .eq('id', registrationParticipantId)
      .select('id')
    if (error) throw error
    affected(data)
  },

  async listPayments(organisationId: string): Promise<PaymentRow[]> {
    const { data, error } = await supabase
      .from('payments')
      .select(
        'id, reference, provider, amount, currency, status, paid_at, created_at, registrations(reference, contact_name, company_name)'
      )
      .eq('organisation_id', organisationId)
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) throw error
    return (data ?? []) as unknown as PaymentRow[]
  },

  exportCsv(organisationId: string, filters: ExportFilters = {}): Promise<Blob> {
    const params: Record<string, string> = { organisation_id: organisationId }
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params[k] = v
    })
    return ApiService.get<Blob>('/registrations-export', { params, responseType: 'blob' })
  }
}
