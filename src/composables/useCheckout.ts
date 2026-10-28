import { ref } from 'vue'
import {
  runCheckout,
  type QuidlyWidgetParams,
  type CheckoutResult,
} from '@/lib/quidlyPay'
import { RegistrationsService } from '@/services/traininghub'
import {
  loadPendingPayment,
  savePendingPayment,
} from '@/utils/pendingPayment'

export function useCheckout() {
  const paying = ref(false)

  async function pay(
    widget: QuidlyWidgetParams,
  ): Promise<CheckoutResult> {
    paying.value = true

    try {
      console.log('[Checkout] Starting Quidly checkout', {
        merchantReference: widget.reference,
        hasReference: Boolean(widget.reference),
      })

      return await runCheckout(widget, async (reference, quidlyRef) => {
        console.log('[Checkout] Quidly callback received', {
          merchantReference: reference,
          quidlyRef: quidlyRef ?? null,
          hasQuidlyRef: Boolean(quidlyRef),
        })

        if (quidlyRef) {
          const previous = loadPendingPayment()

          console.log('[Checkout] Saving Quidly reference', {
            foundPendingPayment: Boolean(previous),
            quidlyRef,
          })

          if (previous) {
            savePendingPayment({
              ...previous,
              quidly_ref: quidlyRef,
            })
          } else {
            console.warn(
              '[Checkout] No pending payment found; Quidly reference was not saved locally',
            )
          }
        } else {
          console.warn(
            '[Checkout] Widget callback did not provide a Quidly reference',
          )
        }

        console.log('[Checkout] Calling payments-verify', {
          merchantReference: reference,
          quidlyRef: quidlyRef ?? null,
          hasQuidlyRef: Boolean(quidlyRef),
        })

        const res = await RegistrationsService.verifyPayment(
          reference,
          quidlyRef,
        )

        console.log('[Checkout] payments-verify response', {
          merchantReference: res.payment?.reference,
          paymentStatus: res.payment?.status,
          registrationReference: res.registration?.reference,
        })

        return { status: res.payment.status }
      })
    } catch (e) {
      console.error('[Checkout] Checkout or verification failed', {
        message:
          e instanceof Error
            ? e.message
            : 'Payment could not be completed.',
      })

      return {
        status: 'failed',
        message:
          e instanceof Error
            ? e.message
            : 'Payment could not be completed.',
      }
    } finally {
      paying.value = false
    }
  }

  return { paying, pay }
}