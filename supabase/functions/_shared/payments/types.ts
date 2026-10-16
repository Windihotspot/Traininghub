// _shared/payments/types.ts
export type ProviderStatus = 'paid' | 'failed' | 'pending' | 'cancelled'

export interface InitializeInput {
  reference: string
  amount: number
  currency: string
  email: string
  name?: string
  callbackUrl: string
  metadata?: Record<string, unknown>
}
export interface InitializeResult { checkoutUrl: string; providerTransactionId?: string; raw?: unknown }
export interface VerifyResult {
  status: ProviderStatus
  reference: string
  amount?: number
  currency?: string
  providerTransactionId?: string
  raw?: unknown
}

export interface PaymentProvider {
  name: string
  signatureHeader: string
  initializePayment(input: InitializeInput): Promise<InitializeResult>
  verifyPayment(reference: string): Promise<VerifyResult>
  verifyWebhookSignature(rawBody: string, signature: string | null): Promise<boolean>
  parseWebhook(rawBody: string): { reference: string; event?: string }
  refundPayment?(reference: string, amount?: number): Promise<{ ok: boolean; raw?: unknown }>
}
