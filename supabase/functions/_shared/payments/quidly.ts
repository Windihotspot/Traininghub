// _shared/payments/quidly.ts

import type {
  PaymentProvider,
  InitializeInput,
  InitializeResult,
  VerifyResult,
} from './types.ts'

import {
  widgetParams,
  verifyPayment as verifyQuidlyPayment,
  verifyWebhookSignature as verifyQuidlyWebhookSignature,
  parseCallback,
} from './quidlyPay.ts'

const env = (key: string, fallback = '') =>
  Deno.env.get(key) ?? fallback

export const quidlyProvider: PaymentProvider = {
  name: 'quidly',

  signatureHeader: 'X-Quidly-Signature',

  async initializePayment(
    input: InitializeInput,
  ): Promise<InitializeResult> {
    console.log('[Quidly] initializePayment called', {
      reference: input.reference,
      amountNaira: input.amount,
      currency: input.currency,
      email: input.email,
      hasPublicKey: Boolean(env('QUIDLY_SECRET_KEY')),
    })

    if (input.currency.toUpperCase() !== 'NGN') {
      throw new Error(
        `Quidly does not support currency ${input.currency}`,
      )
    }

    const widget = widgetParams({
      reference: input.reference,
      email: input.email,
      amountNaira: input.amount,
    })

    console.log('[Quidly] Widget parameters created', {
      reference: widget.reference,
      amountKobo: widget.amount,
      currency: widget.currency_code,
      hasKey: Boolean(widget.key),
      paymentMethods: widget.paymentmethods,
    })

    return {
      widget,
      checkoutUrl: undefined,
      raw: {
        mode: 'widget',
        reference: input.reference,
      },
    }
  },

  async verifyPayment(
    providerRef: string,
  ): Promise<VerifyResult> {
    console.log('[Quidly] Verifying provider reference', {
      providerRef,
    })

    const result = await verifyQuidlyPayment(providerRef)

    const status: VerifyResult['status'] =
      result.status === 'success'
        ? 'paid'
        : result.status === 'failed'
          ? 'failed'
          : 'pending'

    return {
      status,
      reference: result.reference,
      amount:
        result.amountKobo !== null
          ? result.amountKobo / 100
          : undefined,
      currency: result.currency ?? undefined,
      providerTransactionId: providerRef,
      raw: result,
    }
  },

  async verifyWebhookSignature(
    rawBody: string,
    signature: string | null,
  ): Promise<boolean> {
    const bytes = new TextEncoder().encode(rawBody)

    return verifyQuidlyWebhookSignature(bytes, signature)
  },

  parseWebhook(rawBody: string) {
    const payload = JSON.parse(rawBody) as Record<string, unknown>
    const parsed = parseCallback(
      payload as Record<string, any>,
    )

    return {
      reference: parsed.reference,
      providerRef: parsed.quidlyRef,
      event: parsed.eventType ?? undefined,
    }
  },
}