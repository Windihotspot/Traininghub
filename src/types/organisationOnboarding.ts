export interface OrganisationApplicationPayload {
  organisation_name: string
  organisation_description: string
  contact_email: string
  contact_phone: string
  owner_name: string
  owner_email: string
  /** Honeypot field. Must remain empty for real users. */
  website: string
}

export interface OrganisationApplicationResponse {
  success: boolean
  message: string
  application?: {
    id: string
    status: 'pending' | 'processing' | 'approved' | 'rejected'
    created_at: string
  }
}
