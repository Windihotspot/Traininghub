import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders })
}

function cleanText(value: unknown, max = 1000): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (!['GET', 'POST'].includes(req.method)) return json(405, { error: 'Method not allowed' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const appUrl = Deno.env.get('APP_URL')
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('Missing Supabase environment configuration')
    return json(500, { error: 'Server configuration error' })
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) return json(401, { error: 'Authentication required' })

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: authData, error: authError } = await userClient.auth.getUser(token)
  if (authError || !authData.user) return json(401, { error: 'Invalid or expired session' })

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: reviewer, error: reviewerError } = await admin
    .from('profiles')
    .select('id, email, platform_role')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (reviewerError || !reviewer || !['super_admin', 'platform_admin'].includes(reviewer.platform_role)) {
    return json(403, { error: 'Platform administrator access required' })
  }

  if (req.method === 'GET') {
    const url = new URL(req.url)
    const requestedStatus = url.searchParams.get('status') ?? 'pending'
    const allowedStatuses = ['pending', 'processing', 'approved', 'rejected']
    if (!allowedStatuses.includes(requestedStatus)) {
      return json(400, { error: 'Invalid status filter' })
    }
    const page = Math.max(1, Number.parseInt(url.searchParams.get('page') ?? '1', 10) || 1)
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(url.searchParams.get('page_size') ?? '25', 10) || 25))
    const from = (page - 1) * pageSize

    const { data, error, count } = await admin
      .from('organisation_onboarding_applications')
      .select('*', { count: 'exact' })
      .eq('status', requestedStatus)
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1)

    if (error) {
      console.error('Could not list onboarding applications:', error.message)
      return json(500, { error: 'Could not load applications' })
    }
    return json(200, { applications: data ?? [], page, page_size: pageSize, total: count ?? 0 })
  }

  let input: Record<string, unknown>
  try {
    input = await req.json()
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid JSON')
  } catch {
    return json(400, { error: 'A valid JSON request body is required' })
  }

  const applicationId = cleanText(input.application_id, 64)
  const decision = cleanText(input.decision, 20).toLowerCase()
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(applicationId)) {
    return json(400, { error: 'A valid application_id is required' })
  }
  if (!['approve', 'reject'].includes(decision)) {
    return json(400, { error: "decision must be 'approve' or 'reject'" })
  }

  const { data: application, error: applicationError } = await admin
    .from('organisation_onboarding_applications')
    .select('*')
    .eq('id', applicationId)
    .maybeSingle()

  if (applicationError || !application) return json(404, { error: 'Application not found' })

  if (decision === 'reject') {
    const rejectionReason = cleanText(input.rejection_reason, 2000)
    if (!rejectionReason) return json(400, { error: 'A rejection_reason is required' })
    if (application.status !== 'pending') {
      if (application.status === 'rejected') {
        return json(200, { success: true, status: 'rejected', already_rejected: true })
      }
      return json(409, { error: `Application cannot be rejected from status '${application.status}'` })
    }

    const { data: rejected, error: rejectError } = await admin
      .from('organisation_onboarding_applications')
      .update({
        status: 'rejected',
        reviewed_by: reviewer.id,
        reviewed_at: new Date().toISOString(),
        rejection_reason: rejectionReason,
        provisioning_error: null,
      })
      .eq('id', applicationId)
      .eq('status', 'pending')
      .select('id, status, reviewed_at')
      .maybeSingle()

    if (rejectError) {
      console.error('Could not reject application:', rejectError.message)
      return json(500, { error: 'Could not reject application' })
    }
    if (!rejected) return json(409, { error: 'Application status changed; refresh and try again' })

    const { error: auditError } = await admin.from('audit_logs').insert({
      actor_id: reviewer.id,
      actor_email: reviewer.email ?? authData.user.email ?? null,
      action: 'organisation.onboarding.rejected',
      resource_type: 'organisation_onboarding_application',
      resource_id: applicationId,
      metadata: { application_id: applicationId, rejection_reason: rejectionReason },
    })
    if (auditError) console.error('Application rejected but audit logging failed:', auditError.message)

    return json(200, { success: true, application: rejected })
  }

  if (application.status === 'approved' && application.organisation_id) {
    return json(200, {
      success: true,
      status: 'approved',
      organisation_id: application.organisation_id,
      already_approved: true,
    })
  }
  if (!['pending', 'processing'].includes(application.status)) {
    return json(409, { error: `Application cannot be approved from status '${application.status}'` })
  }

  // Reuse an existing profile if this owner already has a TrainingHub account.
  let ownerUserId: string | null = null
  const { data: existingProfile, error: profileLookupError } = await admin
    .from('profiles')
    .select('id, email')
    .eq('email', application.owner_email)
    .limit(1)
    .maybeSingle()

  if (profileLookupError) {
    console.error('Could not look up owner profile:', profileLookupError.message)
    return json(500, { error: 'Could not prepare owner account' })
  }

  if (existingProfile) {
    ownerUserId = existingProfile.id
  } else {
    const inviteOptions = appUrl ? { redirectTo: appUrl } : undefined
    const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(
      application.owner_email,
      {
        data: { full_name: application.owner_name },
        ...(inviteOptions ? { ...inviteOptions } : {}),
      },
    )

    if (inviteError || !inviteData.user) {
      // A simultaneous approval may have created/invited this user. Recheck once
      // before failing so the admin can safely retry without duplicate records.
      const { data: retryProfile } = await admin
        .from('profiles')
        .select('id, email')
        .eq('email', application.owner_email)
        .limit(1)
        .maybeSingle()
      if (retryProfile) ownerUserId = retryProfile.id
      else {
        const reason = inviteError?.message ?? 'Invitation did not return a user'
        await admin.from('organisation_onboarding_applications')
          .update({ provisioning_error: reason })
          .eq('id', applicationId)
          .in('status', ['pending', 'processing'])
        console.error('Owner invitation failed:', reason)
        return json(502, { error: 'Could not invite the organisation owner. The application remains available to retry.' })
      }
    } else {
      ownerUserId = inviteData.user.id
    }
  }

  if (!ownerUserId) return json(500, { error: 'Could not resolve owner account' })

  const { data: provisioned, error: provisionError } = await admin.rpc(
    'approve_organisation_onboarding',
    {
      p_application_id: applicationId,
      p_reviewer_id: reviewer.id,
      p_owner_user_id: ownerUserId,
    },
  )

  if (provisionError) {
    console.error('Organisation provisioning failed:', provisionError.message)
    await admin.from('organisation_onboarding_applications')
      .update({ provisioning_error: provisionError.message })
      .eq('id', applicationId)
      .in('status', ['pending', 'processing'])
    return json(500, { error: 'Owner account is prepared, but organisation provisioning failed. You can safely retry approval.' })
  }

  return json(200, { success: true, result: provisioned })
})
