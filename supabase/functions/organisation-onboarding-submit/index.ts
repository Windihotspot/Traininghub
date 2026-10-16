// POST /functions/v1/organisation-onboarding-submit
// Public organisation registration.
// body: {
//   organisation_name,
//   organisation_description?,
//   contact_email,
//   contact_phone?,
//   owner_name,
//   owner_email,
//   website? // Honeypot field
// }

import {
  serveFn,
  readJson,
  HttpError,
  isEmail,
} from '../_shared/handler.ts'

import { jsonResponse } from '../_shared/cors.ts'
import { getAdminClient } from '../_shared/supabaseAdmin.ts'

type OrganisationOnboardingPayload = {
  organisation_name?: string
  organisation_description?: string | null
  contact_email?: string
  contact_phone?: string | null
  owner_name?: string
  owner_email?: string
  website?: string
}

const normaliseEmail = (value: string) =>
  value.trim().toLowerCase()

const cleanOptionalText = (
  value: unknown,
): string | null => {
  if (typeof value !== 'string') return null

  const trimmed = value.trim()
  return trimmed || null
}

serveFn(async (req) => {
  if (req.method !== 'POST') {
    throw new HttpError(405, 'Method not allowed')
  }

  const body = await readJson<OrganisationOnboardingPayload>(req)

  // Basic field validation
  const organisationName =
    typeof body.organisation_name === 'string'
      ? body.organisation_name.trim()
      : ''

  const ownerName =
    typeof body.owner_name === 'string'
      ? body.owner_name.trim()
      : ''

  const contactEmail =
    typeof body.contact_email === 'string'
      ? normaliseEmail(body.contact_email)
      : ''

  const ownerEmail =
    typeof body.owner_email === 'string'
      ? normaliseEmail(body.owner_email)
      : ''

  if (
    organisationName.length < 2 ||
    organisationName.length > 160
  ) {
    throw new HttpError(
      400,
      'Organisation name must be between 2 and 160 characters',
    )
  }

  if (
    ownerName.length < 2 ||
    ownerName.length > 160
  ) {
    throw new HttpError(
      400,
      'Owner name must be between 2 and 160 characters',
    )
  }

  if (!isEmail(contactEmail)) {
    throw new HttpError(
      400,
      'A valid organisation contact email is required',
    )
  }

  if (!isEmail(ownerEmail)) {
    throw new HttpError(
      400,
      'A valid owner email is required',
    )
  }

  // Honeypot: bots may populate this hidden form field.
  // Return a generic success without creating an application.
  if (
    typeof body.website === 'string' &&
    body.website.trim().length > 0
  ) {
    return jsonResponse(
      {
        success: true,
        message:
          'Your organisation application has been received.',
      },
      201,
      req,
    )
  }

  const description = cleanOptionalText(
    body.organisation_description,
  )

  const contactPhone = cleanOptionalText(
    body.contact_phone,
  )

  if (
    description !== null &&
    description.length > 5000
  ) {
    throw new HttpError(
      400,
      'Organisation description must not exceed 5000 characters',
    )
  }

  if (
    contactPhone !== null &&
    contactPhone.length > 40
  ) {
    throw new HttpError(
      400,
      'Contact phone must not exceed 40 characters',
    )
  }

  const admin = getAdminClient()

  // Create an application only. Do not create an organisation,
  // invite the owner, or assign organisation membership here.
  const { data: application, error } = await admin
    .from('organisation_onboarding_applications')
    .insert({
      organisation_name: organisationName,
      organisation_description: description,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      owner_name: ownerName,
      owner_email: ownerEmail,
      status: 'pending',
    })
    .select('id, status, created_at')
    .single()

  if (error) {
    // The database has a partial unique index preventing
    // duplicate pending/processing applications for an owner.
    if (error.code === '23505') {
      throw new HttpError(
        409,
        'An active application already exists for this owner email',
      )
    }

    // Keep internal database details out of public responses.
    console.error(
      '[organisation-onboarding-submit] Failed to create application',
      {
        code: error.code,
        message: error.message,
      },
    )

    throw new HttpError(
      500,
      'Unable to submit your organisation application. Please try again.',
    )
  }

  return jsonResponse(
    {
      success: true,
      message:
        'Your organisation application has been submitted successfully and is awaiting review.',
      application: {
        id: application.id,
        status: application.status,
        created_at: application.created_at,
      },
    },
    201,
    req,
  )
})