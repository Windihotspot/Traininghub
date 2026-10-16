const allowedOrigins = [
  'https://traininghub-wheat.vercel.app',
  'http://traininghub-wheat.vercel.app',
]

function isAllowedOrigin(origin: string): boolean {
  if (!origin) return false

  // Allow localhost and 127.0.0.1 on any port
  if (/^http:\/\/localhost(?::\d+)?$/.test(origin)) return true
  if (/^http:\/\/127\.0\.0\.1(?::\d+)?$/.test(origin)) return true

  // Allow explicitly listed production origins
  return allowedOrigins.includes(origin)
}

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || ''
  const allowOrigin = isAllowedOrigin(origin) ? origin : 'null'

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods':
      'POST, GET, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  }
}

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: getCorsHeaders(req),
    })
  }

  return null
}

export function jsonResponse(
  body: unknown,
  status = 200,
  req?: Request,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...(req ? getCorsHeaders(req) : {}),
      'Content-Type': 'application/json',
    },
  })
}

export function errorResponse(
  message: string,
  status = 400,
  details?: unknown,
  req?: Request,
): Response {
  return jsonResponse(
    {
      error: message,
      details: details ?? null,
    },
    status,
    req,
  )
}