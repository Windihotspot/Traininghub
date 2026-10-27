// _shared/payments/types.ts
export type ProviderStatus = 'paid' | 'failed' | 'pending' | 'cancelled'

export interface InitializeInput {
  reference: string
  amount: number // major units (naira); providers convert as needed
  currency: string
  email: string
  name?: string
  callbackUrl?: string
  metadata?: Record<string, unknown>
}
export interface InitializeResult {
  /** Params the frontend passes to the provider's inline widget (widget providers). */
  widget?: Record<string, unknown>
  /** Hosted checkout URL (redirect providers only). */
  checkoutUrl?: string
  providerTransactionId?: string
  raw?: unknown
}
export interface VerifyResult {
  status: ProviderStatus
  /** Our reference, as echoed by the provider (may be null if the provider does not echo it). */
  reference: string | null
  amount?: number // major units (naira)
  currency?: string
  providerTransactionId?: string
  raw?: unknown
}

export interface PaymentProvider {
  name: string
  signatureHeader: string
  initializePayment(input: InitializeInput): Promise<InitializeResult>
  /** `providerRef` is the PROVIDER's reference (Quidly: quidly_ref), not ours. */
  verifyPayment(providerRef: string): Promise<VerifyResult>
  verifyWebhookSignature(rawBody: string, signature: string | null): Promise<boolean>
  parseWebhook(rawBody: string): { reference: string | null; providerRef: string | null; event?: string }
  refundPayment?(reference: string, amount?: number): Promise<{ ok: boolean; raw?: unknown }>
}