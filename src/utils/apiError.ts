import axios from 'axios'

export interface NormalizedError {
  status: number | null
  message: string
  details?: Record<string, unknown>
}

const PG: Record<string, string> = {
  '23505': 'That value is already in use.',
  '42501': "You don't have permission to do that.",
  '23503': 'This item is linked to other records.',
  '23514': 'One of the values is not allowed.',
}

// ASSUMPTION: HttpError bodies look like { error: string, ...extra } (e.g. { missing: [...] }).
export function normalizeError(e: unknown, fallback = 'Something went wrong. Please try again.'): NormalizedError {
  if (axios.isAxiosError(e)) {
    const d = e.response?.data as any
    const message = (typeof d === 'string' && d) || d?.error || d?.message || (e.code === 'ECONNABORTED' ? 'Request timed out' : e.message) || fallback
    return { status: e.response?.status ?? null, message, details: typeof d === 'object' ? d : undefined }
  }
  const code = (e as any)?.code
  if (typeof code === 'string' && PG[code]) return { status: null, message: PG[code] }
  if (e && typeof e === 'object' && 'message' in e) return { status: null, message: String((e as any).message) || fallback }
  return { status: null, message: fallback }
}
