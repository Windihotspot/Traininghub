
import { createClient } from '@supabase/supabase-js'
import { ElNotification } from 'element-plus'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const DEBUG_SUPABASE =
  import.meta.env.DEV ||
  import.meta.env.VITE_SUPABASE_DEBUG === 'true'

const redact = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(redact)
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        /password|token|authorization|apikey|secret|cookie|bvn|nin/i.test(
          key,
        )
          ? '[REDACTED]'
          : redact(item),
      ]),
    )
  }

  return value
}

const getErrorMessage = (
  body: unknown,
  fallback: string,
): string => {
  if (typeof body === 'string') {
    try {
      return getErrorMessage(JSON.parse(body), fallback)
    } catch {
      return body.trim() || fallback
    }
  }

  if (body && typeof body === 'object') {
    const error = body as Record<string, unknown>

    for (const key of [
      'message',
      'error_description',
      'error',
      'details',
      'hint',
    ]) {
      const value = error[key]

      if (typeof value === 'string' && value.trim()) {
        return value
      }
    }
  }

  return fallback
}

const loggedFetch: typeof fetch = async (input, init) => {
  const request = new Request(input, init)
  const url = new URL(request.url)

  // Never expose refresh-token request details in logs.
  if (
    url.pathname === '/auth/v1/token' &&
    url.searchParams.get('grant_type') === 'refresh_token'
  ) {
    return fetch(request)
  }

  const requestId = crypto.randomUUID()
  const startedAt = performance.now()

  let payload: unknown

  try {
    const body = await request.clone().text()

    if (body) {
      try {
        payload = JSON.parse(body)
      } catch {
        payload = body
      }
    }
  } catch {
    payload = '[Unable to read request body]'
  }

  if (DEBUG_SUPABASE) {
    console.groupCollapsed(
      `[Supabase Request] ${request.method} ${request.url}`,
    )

    console.log('Request ID:', requestId)
    console.log('Method:', request.method)
    console.log('URL:', request.url)

    console.log(
      'Headers:',
      Object.fromEntries(
        Array.from(request.headers.entries()).map(([key, value]) => [
          key,
          /authorization|apikey|cookie/i.test(key)
            ? '[REDACTED]'
            : value,
        ]),
      ),
    )

    console.log('Payload:', redact(payload))
    console.groupEnd()
  }

  try {
    const response = await fetch(request)
    const durationMs = Math.round(performance.now() - startedAt)

    let responseBody: unknown

    try {
      const body = await response.clone().text()

      if (body) {
        try {
          responseBody = JSON.parse(body)
        } catch {
          responseBody = body
        }
      } else {
        responseBody = null
      }
    } catch {
      responseBody = '[Unable to read response body]'
    }

    if (DEBUG_SUPABASE) {
      const details = {
        requestId,
        status: response.status,
        statusText: response.statusText,
        durationMs,
        response: redact(responseBody),
      }

      if (!response.ok) {
        console.error('[Supabase HTTP Error]', details)
      } else {
        console.log('[Supabase Response]', details)
      }
    }

    // Display every failed HTTP response in the top-right corner.
    if (!response.ok) {
      const message = getErrorMessage(
        responseBody,
        `${response.status} ${response.statusText || 'Request failed'}`,
      )

      ElNotification({
        title: `Supabase Error (${response.status})`,
        message,
        type: 'error',
        position: 'top-right',
        duration: 6000,
        showClose: true,
        dangerouslyUseHTMLString: false,
      })
    }

    return response
  } catch (error) {
    if (DEBUG_SUPABASE) {
      console.error('[Supabase Network Error]', {
        requestId,
        method: request.method,
        url: request.url,
        durationMs: Math.round(performance.now() - startedAt),
        error,
      })
    }

    ElNotification({
      title: 'Network Error',
      message:
        error instanceof Error
          ? error.message
          : 'Unable to connect to Supabase. Please try again.',
      type: 'error',
      position: 'top-right',
      duration: 6000,
      showClose: true,
    })

    throw error
  }
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    global: {
      fetch: loggedFetch,
    },
  },
)
