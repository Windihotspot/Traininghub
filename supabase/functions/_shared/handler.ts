// _shared/handler.ts
// Wraps an edge function: CORS preflight, error mapping, JSON helpers.
import { handleCors, errorResponse } from './cors.ts'

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message)
  }
}

/** Postgres `raise exception` (P0001) => 400/409 with the message; everything else 500. */
export function mapDbError(error: { code?: string; message: string }): HttpError {
  if (error.code === 'P0001') {
    const conflict = /already registered|seats|not open|closed|not opened/i.test(error.message)
    return new HttpError(conflict ? 409 : 400, error.message)
  }
  console.error('DB error:', error)
  return new HttpError(500, 'Database error')
}

export function serveFn(fn: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    const pre = handleCors(req)
    if (pre) return pre
    try {
      return await fn(req)
    } catch (e) {
      if (e instanceof HttpError) return errorResponse(e.message, e.status, e.details, req)
      console.error('Unhandled error:', e)
      return errorResponse('Internal server error', 500, null, req)
    }
  })
}

export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T
  } catch {
    throw new HttpError(400, 'Invalid JSON body')
  }
}

export const isEmail = (v: unknown): v is string =>
  typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

export const isUuid = (v: unknown): v is string =>
  typeof v === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
