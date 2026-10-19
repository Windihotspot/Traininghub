
export interface OrganisationApplicationPayload {
  organisation_name: string
  organisation_description: string
  contact_email: string
  contact_phone: string
  owner_name: string
  owner_email: string

  /** Owner's password for their TrainHub account. */
  password: string

  /** Honeypot field. Must remain empty for real users. */
  website: string
}

export interface OrganisationApplicationResponse {
  success: boolean
  message: string
  organisation?: {
    id: string
    name: string
    slug: string
  }
  user?: {
    id: string
    email: string
  }
}
