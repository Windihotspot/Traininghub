import { ref } from 'vue'
import { RegistrationsService } from '@/services/traininghub'
import { runCheckout, type QuidlyWidgetParams, type CheckoutResult } from '@/lib/quidlyPay'

export function useCheckout() {
  const paying = ref(false)

  async function pay(widget: QuidlyWidgetParams): Promise<CheckoutResult> {
    paying.value = true
    try {
      return await runCheckout(widget, async (reference, quidlyRef) => {
        const res = await RegistrationsService.verifyPayment(reference, quidlyRef)
        return { status: res.payment.status }
      })
    } catch (e) {
      return { status: 'failed', message: e instanceof Error ? e.message : 'Payment could not be completed.' }
    } finally {
      paying.value = false
    }
  }

  return { paying, pay }
}