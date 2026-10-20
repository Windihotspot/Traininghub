
import {
  serveFn,
  readJson,
  HttpError,
  isEmail,
} from '../_shared/handler.ts'

import { jsonResponse } from '../_shared/cors.ts'
import { getAdminClient } from '../_shared/supabaseAdmin.ts'

type RegistrationPayload = {
  organisation_name?: string
  organisation_description?: string | null
  contact_email?: string
  contact_phone?: string | null
  owner_name?: string
  owner_email?: string
  password?: string
  website?: string
}

const normaliseEmail = (value: string) =>
  value.trim().toLowerCase()

const optionalText = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  return value.trim() || null
}

serveFn(async (req) => {
  if (req.method !== 'POST') {
    throw new HttpError(405, 'Method not allowed')
  }

  const body = await readJson<RegistrationPayload>(req)

  const organisationName =
    typeof body.organisation_name === 'string'
      ? body.organisation_name.trim()
      : ''

  const ownerName =
    typeof body.owner_name === 'string'
      ? body.owner_name.trim()
      : ''

  const ownerEmail =
    typeof body.owner_email === 'string'
      ? normaliseEmail(body.owner_email)
      : ''

  const contactEmail =
    typeof body.contact_email === 'string'
      ? normaliseEmail(body.contact_email)
      : ''

  const password =
    typeof body.password === 'string' ? body.password : ''

  if (organisationName.length < 2 || organisationName.length > 160) {
    throw new HttpError(400, 'Organisation name must be between 2 and 160 characters')
  }

  if (ownerName.length < 2 || ownerName.length > 160) {
    throw new HttpError(400, 'Owner name must be between 2 and 160 characters')
  }

  if (!isEmail(ownerEmail) || ownerEmail.length > 254) {
    throw new HttpError(400, 'Enter a valid owner email address')
  }

  if (!isEmail(contactEmail) || contactEmail.length > 254) {
    throw new HttpError(400, 'Enter a valid organisation contact email')
  }

  // Use a minimum of 12 characters. Never log or persist this value.
  if (password.length < 12 || password.length > 128) {
    throw new HttpError(400, 'Password must be between 12 and 128 characters')
  }

  const description = optionalText(body.organisation_description)
  const phone = optionalText(body.contact_phone)

  if (description && description.length > 3000) {
    throw new HttpError(400, 'Description must not exceed 3000 characters')
  }

  if (phone && phone.length > 40) {
    throw new HttpError(400, 'Phone number must not exceed 40 characters')
  }

  // Honeypot: return a generic response without provisioning an account.
  if (typeof body.website === 'string' && body.website.trim()) {
    return jsonResponse({
      success: true,
      message: 'Registration received.',
    }, 201, req)
  }

  const admin = getAdminClient()

  const { data: created, error: authError } =
    await admin.auth.admin.createUser({
      email: ownerEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: ownerName,
      },
    })

  if (authError || !created.user) {
    // Avoid exposing whether a particular email is already registered.
    if (
      authError?.message.toLowerCase().includes('already') ||
      authError?.message.toLowerCase().includes('registered')
    ) {
      throw new HttpError(
        409,
        'An account may already exist for this email. Try logging in instead.',
      )
    }

    console.error('[organisation-onboarding-submit] Auth creation failed', {
      message: authError?.message,
    })

    throw new HttpError(400, 'Unable to create the account. Check your details and try again.')
  }

  const userId = created.user.id
  let provisioned = false

  try {
    const { data, error } = await admin.rpc(
      'provision_registered_organisation',
      {
        p_user_id: userId,
        p_owner_email: ownerEmail,
        p_owner_name: ownerName,
        p_organisation_name: organisationName,
        p_organisation_description: description,
        p_contact_email: contactEmail,
        p_contact_phone: phone,
      },
    )

    if (error) {
      console.error('[organisation-onboarding-submit] Provisioning failed', {
        user_id: userId,
        code: error.code,
        message: error.message,
      })

      throw new Error('Organisation provisioning failed')
    }

    const organisation = Array.isArray(data) ? data[0] : null

    if (!organisation?.organisation_id) {
      throw new Error('Provisioning did not return an organisation')
    }

    provisioned = true

    return jsonResponse({
      success: true,
      message: 'Your organisation account is ready. You can now log in.',
      organisation: {
        id: organisation.organisation_id,
        name: organisation.organisation_name,
        slug: organisation.organisation_slug,
      },
      user: {
        id: userId,
        email: ownerEmail,
      },
    }, 201, req)
  } catch (error) {
    // The RPC is transactional. If it failed, remove the newly created
    // Auth user to avoid leaving an orphaned account.
    if (!provisioned) {
      const { error: cleanupError } =
        await admin.auth.admin.deleteUser(userId)

      if (cleanupError) {
        console.error('[organisation-onboarding-submit] Auth cleanup failed', {
          user_id: userId,
          message: cleanupError.message,
        })
      }
    }

    throw new HttpError(
      500,
      'We could not finish setting up your organisation. Please try again.',
    )
  }
})
