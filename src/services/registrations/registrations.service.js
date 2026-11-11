import ApiService from '@/services/api'
import { supabase } from '@/services/supabase'
import type {
  CreateRegistrationPayload, CreateRegistrationResponse,
  PaymentVerifyResponse, PaymentInitializeResponse, ExportFilters,
} from '@/types/traininghub'

export const RegistrationsService = {
  create: (payload: CreateRegistrationPayload) =>
    ApiService.post<CreateRegistrationResponse>('/registrations-create', payload),

  verifyPayment: (reference: string) =>
    ApiService.get<PaymentVerifyResponse>('/payments-verify', { params: { reference } }),

  // Server issues a NEW payment reference per attempt and checks the email (anti-enumeration).
  resumePayment: (registration_reference: string, contact_email: string) =>
    ApiService.post<PaymentInitializeResponse>('/payments-initialize', { registration_reference, contact_email }),

  async listForOrg(organisationId: string) {
    const { data, error } = await supabase.from('registrations')
      .select('*, trainings(title), payments(status, paid_at)')
      .eq('organisation_id', organisationId).order('created_at', { ascending: false })
    if (error) throw error
    return data ?? []
  },

  exportCsv(organisationId: string, filters: ExportFilters = {}): Promise<Blob> {
    const params: Record<string, string> = { organisation_id: organisationId }
    Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v })
    return ApiService.get<Blob>('/registrations-export', { params, responseType: 'blob' })
  },
}