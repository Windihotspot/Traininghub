
import { createClient } from '@supabase/supabase-js'

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
        /password|token|authorization|apikey|secret|cookie|bvn|nin/i.test(key)
          ? '[REDACTED]'
          : redact(item),
      ]),
    )
  }

  return value
}

const loggedFetch: typeof fetch = async (input, init) => {
  const request = new Request(input, init)
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

      try {
        responseBody = body ? JSON.parse(body) : null
      } catch {
        responseBody = body
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

    throw error
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: loggedFetch,
  },
})
