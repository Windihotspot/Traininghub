import type { QuidlyWidgetParams } from '@/lib/quidlyPay' // adjust to your filename


export type RegistrationType = 'individual' | 'corporate'
export type TrainingAction =
  | 'publish' | 'unpublish' | 'open_registration'
  | 'close_registration' | 'complete' | 'archive'
export type OrgRole = 'org_owner' | 'org_admin' | 'org_staff'
export type TrainingStatus =
  | 'draft' | 'published' | 'registration_open'
  | 'registration_closed' | 'completed' | 'archived'

export interface Training {
  id: string
  organisation_id: string
  category_id?: string | null
  title: string
  slug: string
  short_description: string | null
  overview?: string | null
  who_should_attend?: string | null
  learning_objectives?: string | null
  course_outline?: string | null
  requirements?: string | null
  start_date: string | null
  end_date: string | null
  start_time: string | null
  end_time: string | null
  timezone?: string
  delivery_mode: 'virtual' | 'physical' | 'hybrid'
  location?: string | null
  meeting_url?: string | null
  fee: number
  currency?: string
  capacity: number | null
  registration_open_at?: string | null
  registration_close_at?: string | null
  status: TrainingStatus
  featured?: boolean
  cover_image?: string | null
  brochure_url?: string | null
  organisations?: { slug: string; name: string }
}

export interface Discount {
  id: string
  organisation_id: string
  training_id: string
  name: string
  min_participants: number
  type: 'percentage' | 'fixed'
  value: number
  is_active: boolean
}

export interface Category { id: string; organisation_id: string | null; name: string; slug: string }

export interface RegistrationRow {
  id: string; reference: string; status: string; registration_type: RegistrationType
  company_name: string | null; contact_name: string; contact_email: string
  participant_count: number; total_amount: number; currency: string
  notes: string | null; created_at: string
  trainings: { title: string } | null
  payments: { reference: string; status: string; paid_at: string | null }[]
  registration_participants: {
    id: string; attended: boolean
    participants: { first_name: string; last_name: string; email: string; phone: string | null; job_title: string | null } | null
  }[]
}

export interface PaymentRow {
  id: string; reference: string; provider: string; amount: number; currency: string
  status: string; paid_at: string | null; created_at: string
  registrations: { reference: string; contact_name: string; company_name: string | null } | null
}

export interface AuditRow {
  id: number; action: string; actor_email: string | null; resource_type: string | null
  metadata: Record<string, unknown>; created_at: string
}

export interface ParticipantInput {
  first_name: string
  last_name: string
  email: string
  phone?: string
  job_title?: string
}

export interface CreateRegistrationPayload {
  training_id: string
  registration_type: RegistrationType
  company_name?: string
  contact: { name: string; email: string; phone?: string }
  participants: ParticipantInput[]
}

export interface CreateRegistrationResponse {
  registration: {
    id: string
    reference: string
    participant_count: number
    subtotal: number
    discount_amount: number
    total_amount: number
    currency: string
  }
   payment: { reference: string; checkout_url: string | null; widget: QuidlyWidgetParams | null; paid: boolean }
}

export interface PricingPreview {
  subtotal: number
  discount_amount: number
  total_amount: number
  currency?: string
  [k: string]: unknown
}

// payments-verify -> { payment: { reference, status }, registration: { reference } }
export interface PaymentVerifyResponse {
  payment: { reference: string; status: 'paid' | 'failed' | 'cancelled' | 'processing' | string }
  registration: { reference?: string }
}
// payments-initialize -> { payment: { reference, checkout_url } }
// payments-initialize -> { payment: { reference, checkout_url, widget } }
export interface PaymentInitializeResponse {
  payment: { reference: string; checkout_url: string | null; widget: QuidlyWidgetParams | null }
}
export interface OrgMember {
  id: string
  user_id: string
  role: OrgRole
  profiles: { full_name: string | null; email: string } | null
}

export interface ExportFilters {
  training_id?: string
  payment_status?: string
  registration_status?: string
  company?: string
  from?: string
  to?: string
}

export interface CreateOrganisationPayload {
  name: string
  slug?: string
  description?: string
  contact_email?: string
  owner_email: string
  owner_name?: string
}
