// supabase/functions/_shared/quidlyPay.ts
//
// TEMPORARY DEBUGGING VERSION
//
// Purpose:
// 1. Inspect Quidly API configuration without exposing secrets.
// 2. Log the exact verification request metadata.
// 3. Inspect the provider response and identify reference/status fields.
// 4. Diagnose webhook payload parsing and signature validation.
// 5. Avoid logging API keys, authorization headers, emails, or bank details.
//
// Confirmed verification request:
// POST https://paymentapi.quidly.ng/api/verifypayment
// Authorization: Bearer <QUIDLY_PAY_SECRET_KEY>
// Content-Type: application/json
// Body: { "quidly_ref": "QLY..." }
//
// Confirmed webhook:
// POST { event_type, data: { quidly_ref, ... } }
// Header: X-Quidly-Signature
// Signature: HMAC-SHA512 of the exact raw body, uppercase hexadecimal.
//
// IMPORTANT:
// Do not mark payments paid based only on widget callbacks or webhooks.
// Always verify payment status with the provider.

import { HttpError } from '../http.ts'

// ============================================================
// 1. ENVIRONMENT CONFIGURATION
// ============================================================

const env = (key: string, fallback = ''): string =>
  Deno.env.get(key) ?? fallback

function hasEnv(key: string): boolean {
  return Boolean(Deno.env.get(key)?.trim())
}

function logConfig() {
  console.log('[Quidly Debug] Configuration', {
    publicKeyConfigured: hasEnv('QUIDLY_PAY_PUBLIC_KEY'),
    secretKeyConfigured: hasEnv('QUIDLY_PAY_SECRET_KEY'),
    webhookSecretConfigured: hasEnv('QUIDLY_PAY_WEBHOOK_SECRET'),

    // Legacy names currently used by the TrainingHub implementation.
    legacyQuidlySecretConfigured: hasEnv('QUIDLY_SECRET_KEY'),
    legacyWebhookSecretConfigured: hasEnv('QUIDLY_WEBHOOK_SECRET'),

    apiBaseConfigured: hasEnv('QUIDLY_PAY_API_BASE'),
    verifyPathConfigured: hasEnv('QUIDLY_PAY_VERIFY_PATH'),
    methodsConfigured: hasEnv('QUIDLY_PAY_METHODS'),
  })
}

export const toKobo = (naira: number | string): number =>
  Math.round(Number(naira) * 100)

// ============================================================
// 2. WIDGET INITIALIZATION
// ============================================================

/**
 * These parameters are returned to the frontend.
 *
 * QUIDLY_PAY_PUBLIC_KEY is preferred.
 *
 * QUIDLY_SECRET_KEY is temporarily supported as a legacy fallback
 * because the current TrainingHub code uses that variable name.
 *
 * IMPORTANT:
 * Only use the fallback if QUIDLY_SECRET_KEY actually contains
 * your PUBLIC widget key. Never expose your private API secret.
 */
export function widgetParams(p: {
  reference: string
  email: string
  amountNaira: number
}) {
  const publicKey =
    env('QUIDLY_PAY_PUBLIC_KEY') ||
    env('QUIDLY_SECRET_KEY')

  const keySource = hasEnv('QUIDLY_PAY_PUBLIC_KEY')
    ? 'QUIDLY_PAY_PUBLIC_KEY'
    : hasEnv('QUIDLY_SECRET_KEY')
      ? 'QUIDLY_SECRET_KEY_LEGACY_FALLBACK'
      : 'MISSING'

  console.log('[Quidly Debug] Building widget parameters', {
    reference: p.reference,
    amountNaira: p.amountNaira,
    amountKobo: toKobo(p.amountNaira),
    currency: 'NGN',
    keyConfigured: Boolean(publicKey),
    keySource,
    emailProvided: Boolean(p.email),
  })

  if (!publicKey) {
    console.error('[Quidly Debug] Widget public key is missing')

    throw new HttpError(
      500,
      'Payments are not configured',
    )
  }

  const paymentMethods = env(
    'QUIDLY_PAY_METHODS',
    'card,bank_transfer,pay4me',
  )
    .split(',')
    .map((method) => method.trim())
    .filter(Boolean)

  console.log('[Quidly Debug] Widget methods', {
    methods: paymentMethods,
    referenceProvided: Boolean(p.reference),
  })

  return {
    key: publicKey,
    email: p.email,
    amount: toKobo(p.amountNaira),
    currency_code: 'NGN',
    paymentmethods: paymentMethods,
    reference: p.reference,
    tx_ref: p.reference,
  }
}

// ============================================================
// 3. VERIFICATION TYPES AND STATUS MAPPING
// ============================================================

export type Verified = {
  status: 'success' | 'pending' | 'failed'
  amountKobo: number | null
  currency: string | null
  reference: string | null
  email: string | null
  channel: string | null
}

const OK = [
  'success',
  'successful',
  'completed',
  'paid',
]

const BAD = [
  'failed',
  'declined',
  'cancelled',
  'canceled',
  'abandoned',
  'expired',
  'reversed',
]

function normalizeProviderStatus(
  value: unknown,
): Verified['status'] {
  const status = String(value ?? '')
    .trim()
    .toLowerCase()

  if (OK.includes(status)) return 'success'
  if (BAD.includes(status)) return 'failed'

  return 'pending'
}

function getObject(
  value: unknown,
): Record<string, any> {
  if (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  ) {
    return value as Record<string, any>
  }

  return {}
}

function firstString(
  ...values: unknown[]
): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }

  return null
}

function firstNumber(
  ...values: unknown[]
): number | null {
  for (const value of values) {
    if (value === null || value === undefined || value === '') {
      continue
    }

    const number = Number(value)

    if (Number.isFinite(number)) {
      return number
    }
  }

  return null
}

// ============================================================
// 4. QUIdLY PAYMENT VERIFICATION
// ============================================================

/**
 * Calls Quidly using the provider's QLY reference.
 *
 * This function must receive a provider reference such as:
 * QLY84300a30-d2d4-11
 *
 * Do not pass the merchant reference PAY-... unless Quidly
 * explicitly confirms that its verification endpoint accepts it.
 */
export async function verifyPayment(
  quidlyRef: string,
): Promise<Verified> {
  const reference = quidlyRef.trim()

  if (!reference) {
    console.error('[Quidly Verify] Missing provider reference')

    throw new HttpError(
      400,
      'Quidly payment reference is required',
    )
  }

  logConfig()

  // Prefer the standardized private API secret.
  // The legacy fallback is TEMPORARY and should be removed
  // after the Supabase environment variables are standardized.
  const secretSource = hasEnv('QUIDLY_PAY_SECRET_KEY')
    ? 'QUIDLY_PAY_SECRET_KEY'
    : hasEnv('QUIDLY_SECRET_KEY')
      ? 'QUIDLY_SECRET_KEY_LEGACY_FALLBACK'
      : 'MISSING'

  const secret =
    env('QUIDLY_PAY_SECRET_KEY') ||
    env('QUIDLY_SECRET_KEY')

  if (!secret) {
    console.error('[Quidly Verify] API secret is missing', {
      expectedVariable: 'QUIDLY_PAY_SECRET_KEY',
      legacyVariableConfigured: hasEnv('QUIDLY_SECRET_KEY'),
    })

    throw new HttpError(
      500,
      'Payments are not configured',
    )
  }

  const url =
    'https://paymentapi.quidly.ng/api/verifypayment'

  const requestBody = {
    quidly_ref: reference,
  }

  console.log('[Quidly Verify] Request starting', {
    endpoint: url,
    method: 'POST',
    secretSource,
    quidlyRef: reference,
    requestBodyKeys: Object.keys(requestBody),
    hasAuthorizationHeader: Boolean(secret),
  })

  let response: Response

  try {
    response = await fetch(url, {
      method: 'POST',

      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },

      body: JSON.stringify(requestBody),

      signal: AbortSignal.timeout(10000),
    })
  } catch (error) {
    console.error('[Quidly Verify] Network request failed', {
      quidlyRef: reference,
      errorName:
        error instanceof Error
          ? error.name
          : 'UnknownError',
      errorMessage:
        error instanceof Error
          ? error.message
          : 'Unknown network error',
    })

    throw new HttpError(
      502,
      'We could not reach the payment provider. Please try again.',
    )
  }

  console.log('[Quidly Verify] HTTP response received', {
    httpStatus: response.status,
    httpStatusText: response.statusText,
    ok: response.ok,
    contentType: response.headers.get('content-type'),
    quidlyRef: reference,
  })

  const responseText = await response.text()

  let json: Record<string, any> | null = null

  try {
    const parsed: unknown = JSON.parse(responseText)

    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed)
    ) {
      json = parsed as Record<string, any>
    }
  } catch {
    console.error('[Quidly Verify] Response was not valid JSON', {
      httpStatus: response.status,
      responseLength: responseText.length,
      responsePreview: responseText.slice(0, 500),
    })
  }

  if (!response.ok || !json) {
    console.error('[Quidly Verify] Provider request failed', {
      httpStatus: response.status,
      httpStatusText: response.statusText,
      responseKeys: json ? Object.keys(json) : [],
      responsePreview: responseText.slice(0, 1000),
    })

    throw new HttpError(
      502,
      'We could not confirm your payment yet. Please try again.',
    )
  }

  // Some APIs wrap the transaction in { data: {...} }.
  // Others return the transaction fields at the top level.
  const d = getObject(json.data ?? json)

  const customer = getObject(d.customer)
  const transaction = getObject(d.transaction)
  const payment = getObject(d.payment)

  // DEBUG: expose the response structure and relevant transaction
  // fields, without logging the complete response or personal data.
  console.log('[Quidly Verify] Response structure', {
    topLevelKeys: Object.keys(json),
    dataIsObject:
      json.data !== null &&
      typeof json.data === 'object' &&
      !Array.isArray(json.data),
    dataKeys: Object.keys(d),

    transactionKeys: Object.keys(transaction),
    paymentKeys: Object.keys(payment),

    providerStatus:
      d.status ??
      transaction.status ??
      payment.status ??
      null,

    providerMessage:
      json.message ??
      d.message ??
      null,

    providerSuccess:
      json.success ??
      d.success ??
      null,

    // We need to know which reference fields Quidly returns.
    merchantRef:
      d.merchant_ref ??
      transaction.merchant_ref ??
      payment.merchant_ref ??
      null,

    transactionRef:
      d.transaction_ref ??
      transaction.transaction_ref ??
      payment.transaction_ref ??
      null,

    reference:
      d.reference ??
      transaction.reference ??
      payment.reference ??
      null,

    txRef:
      d.tx_ref ??
      transaction.tx_ref ??
      payment.tx_ref ??
      null,

    quidlyRef:
      d.quidly_ref ??
      transaction.quidly_ref ??
      payment.quidly_ref ??
      null,

    // Useful for amount/currency validation.
    amount:
      d.amount ??
      transaction.amount ??
      payment.amount ??
      null,

    currency:
      d.currency ??
      d.currency_code ??
      transaction.currency ??
      payment.currency ??
      null,

    channel:
      d.channel ??
      d.payment_method ??
      transaction.channel ??
      payment.channel ??
      null,

    emailPresent: Boolean(
      d.email ??
      customer.email ??
      transaction.email ??
      payment.email,
    ),
  })

  // Do not assume the provider's status field is always top-level
  // within data. Inspect the diagnostic above if the result is pending.
  const providerStatus =
    d.status ??
    transaction.status ??
    payment.status ??
    ''

  const normalizedStatus =
    normalizeProviderStatus(providerStatus)

  // IMPORTANT:
  // These fields are potential merchant references.
  // quidly_ref is deliberately NOT used as the merchant reference.
  //
  // The payments-verify function compares this value to PAY-...
  // If Quidly only returns QLY..., that comparison needs to use a
  // securely stored payment-to-provider-reference association instead.
  const merchantReference = firstString(
    d.merchant_ref,
    d.transaction_ref,
    d.reference,
    d.tx_ref,

    transaction.merchant_ref,
    transaction.transaction_ref,
    transaction.reference,
    transaction.tx_ref,

    payment.merchant_ref,
    payment.transaction_ref,
    payment.reference,
    payment.tx_ref,
  )

  const amountKobo = firstNumber(
    d.amount,
    transaction.amount,
    payment.amount,
  )

  const currency = firstString(
    d.currency,
    d.currency_code,
    transaction.currency,
    transaction.currency_code,
    payment.currency,
    payment.currency_code,
  )

  const email = firstString(
    d.email,
    customer.email,
    transaction.email,
    payment.email,
  )

  const channel = firstString(
    d.channel,
    d.payment_method,
    transaction.channel,
    transaction.payment_method,
    payment.channel,
    payment.payment_method,
  )

  const result: Verified = {
    status: normalizedStatus,
    amountKobo,
    currency,
    reference: merchantReference,
    email,
    channel,
  }

  console.log('[Quidly Verify] Normalized result', {
    quidlyRef: reference,
    status: result.status,
    rawProviderStatus: String(providerStatus),
    amountKobo: result.amountKobo,
    currency: result.currency,
    merchantReference: result.reference,
    merchantReferenceMatchesProviderRef:
      result.reference === reference,
    emailPresent: Boolean(result.email),
    channel: result.channel,
  })

  return result
}

// ============================================================
// 5. WEBHOOK PAYLOAD PARSING
// ============================================================

export type CallbackEvent =
  | 'payment.success'
  | 'payment.failed'
  | 'payment.expired'
  | 'payment.reversed'

export function parseCallback(
  payload: Record<string, any>,
) {
  const data = getObject(payload?.data)

  const getString = (...values: unknown[]): string | null => {
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) {
        return value.trim()
      }
    }

    return null
  }

  const result = {
    eventType: getString(payload?.event_type),

    quidlyRef: getString(
      data.quidly_ref,
      payload?.quidly_ref,
    ),

    reference: getString(
      data.merchant_ref,
      data.transaction_ref,
      data.reference,
      data.tx_ref,

      payload?.merchant_ref,
      payload?.transaction_ref,
      payload?.reference,
      payload?.tx_ref,
    ),
  }

  console.log('[Quidly Webhook] Parsed payload', {
    topLevelKeys: Object.keys(payload ?? {}),
    dataKeys: Object.keys(data),
    eventType: result.eventType,
    quidlyRef: result.quidlyRef,
    merchantReference: result.reference,
    hasQuidlyRef: Boolean(result.quidlyRef),
    hasMerchantReference: Boolean(result.reference),
  })

  return result
}

// ============================================================
// 6. WEBHOOK SIGNATURE VALIDATION
// ============================================================

const enc = new TextEncoder()

const hex = (buf: ArrayBuffer): string =>
  [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

export async function verifyWebhookSignature(
  rawBody: Uint8Array,
  header: string | null,
): Promise<boolean> {
  // Standard variable first, legacy fallback second.
  const secret =
    env('QUIDLY_PAY_WEBHOOK_SECRET') ||
    env('QUIDLY_WEBHOOK_SECRET')

  const secretSource = hasEnv('QUIDLY_PAY_WEBHOOK_SECRET')
    ? 'QUIDLY_PAY_WEBHOOK_SECRET'
    : hasEnv('QUIDLY_WEBHOOK_SECRET')
      ? 'QUIDLY_WEBHOOK_SECRET_LEGACY_FALLBACK'
      : 'MISSING'

  console.log('[Quidly Webhook] Signature validation starting', {
    secretConfigured: Boolean(secret),
    secretSource,
    signatureHeaderPresent: Boolean(header),
    rawBodyLength: rawBody.length,
  })

  if (!secret) {
    console.error('[Quidly Webhook] Webhook secret is missing')

    throw new HttpError(
      500,
      'Webhook secret is not configured',
    )
  }

  if (!header) {
    console.warn('[Quidly Webhook] Signature header is missing')
    return false
  }

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      {
        name: 'HMAC',
        hash: 'SHA-512',
      },
      false,
      ['sign'],
    )

    const expected = hex(
      await crypto.subtle.sign(
        'HMAC',
        key,
        rawBody,
      ),
    ).toUpperCase()

    const given = header.trim().toUpperCase()

    if (given.length !== expected.length) {
      console.warn('[Quidly Webhook] Signature length mismatch', {
        expectedLength: expected.length,
        receivedLength: given.length,
      })

      return false
    }

    let diff = 0

    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ given.charCodeAt(i)
    }

    const valid = diff === 0

    console.log('[Quidly Webhook] Signature validation result', {
      valid,
      algorithm: 'HMAC-SHA512',
      signatureLength: given.length,
    })

    return valid
  } catch (error) {
    console.error('[Quidly Webhook] Signature validation error', {
      errorName:
        error instanceof Error
          ? error.name
          : 'UnknownError',
      errorMessage:
        error instanceof Error
          ? error.message
          : 'Unknown signature error',
    })

    throw new HttpError(
      500,
      'Could not validate webhook signature',
    )
  }
}