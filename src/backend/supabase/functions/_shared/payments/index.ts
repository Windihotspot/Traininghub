// _shared/payments/index.ts
import type { PaymentProvider } from './types.ts'
import { quidlyProvider } from './quidly.ts'

const providers: Record<string, PaymentProvider> = { quidly: quidlyProvider }
// add: providers.paystack = paystackProvider, providers.bank_transfer = ...

export function getProvider(name = Deno.env.get('DEFAULT_PAYMENT_PROVIDER') ?? 'quidly'): PaymentProvider {
  const p = providers[name]
  if (!p) throw new Error(`Unknown payment provider: ${name}`)
  return p
}
export * from './types.ts'
