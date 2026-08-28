import {
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js'
import { useRef, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'

export type PreparedStripePayment = {
  clientSecret: string
  paymentIntentId: string
  amount: number
  currency: string
}

type StripeCheckoutFormProps = {
  amount: number
  disabled?: boolean
  onValidate?: () => string
  onProcessing?: () => void
  onConfirming?: () => void
  onCreatePayment?: () => Promise<PreparedStripePayment>
  onSuccess: (paymentIntentId?: string) => void | Promise<void>
  onFailure?: (message: string, phase: 'preparation' | 'confirmation') => void
}

export default function StripeCheckoutForm({
  amount,
  disabled = false,
  onValidate,
  onProcessing,
  onConfirming,
  onCreatePayment,
  onSuccess,
  onFailure,
}: StripeCheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()

  const [error, setError] = useState('')
  const [isPaying, setIsPaying] = useState(false)
  const submissionInFlightRef = useRef(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!stripe || !elements || submissionInFlightRef.current) return

    setError('')
    const validationMessage = onValidate?.() || ''

    if (validationMessage) {
      setError(validationMessage)
      return
    }

    submissionInFlightRef.current = true
    setIsPaying(true)

    // Deferred Stripe Elements validates and tokenizes the customer's details
    // before DigitalHood creates an order or PaymentIntent. Card data remains
    // inside Stripe's iframe and never passes through our application server.
    const submission = await elements.submit()

    if (submission.error) {
      setError(submission.error.message || 'Check your payment details and try again.')
      submissionInFlightRef.current = false
      setIsPaying(false)
      return
    }

    onProcessing?.()

    let preparedPayment: PreparedStripePayment | undefined

    try {
      preparedPayment = await onCreatePayment?.()
    } catch (preparationError) {
      const message =
        preparationError instanceof Error
          ? preparationError.message
          : 'Could not create the secure card payment.'

      setError(message)
      submissionInFlightRef.current = false
      setIsPaying(false)
      onFailure?.(message, 'preparation')
      return
    }

    onConfirming?.()

    let result

    try {
      result = await stripe.confirmPayment({
        elements,
        ...(preparedPayment?.clientSecret
          ? { clientSecret: preparedPayment.clientSecret }
          : {}),
        redirect: 'if_required',
      })
    } catch (confirmationError) {
      const message =
        confirmationError instanceof Error
          ? confirmationError.message
          : 'The card provider could not be reached. Please try again.'

      setError(message)
      submissionInFlightRef.current = false
      setIsPaying(false)
      onFailure?.(message, 'confirmation')
      return
    }

    if (result.error) {
      const message = result.error.message || 'Payment failed.'
      setError(message)
      submissionInFlightRef.current = false
      setIsPaying(false)
      onFailure?.(message, 'confirmation')
      return
    }

    await onSuccess(
      result.paymentIntent?.id || preparedPayment?.paymentIntentId
    )
    submissionInFlightRef.current = false
    setIsPaying(false)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-dh-light-gray bg-white p-3 sm:p-3.5"
    >
      <PaymentElement
        options={{
          layout: {
            type: 'tabs',
            defaultCollapsed: false,
          },
        }}
      />

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs font-semibold text-red-700">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={!stripe || !elements || isPaying || disabled}
        className="mt-3 h-10 w-full rounded-lg bg-dh-primary text-xs font-black text-white hover:bg-dh-secondary"
      >
        {disabled
          ? 'Card payment unavailable'
          : isPaying
            ? 'Securing card payment…'
            : `Pay K${amount.toFixed(2)}`}
      </Button>

      <p className="mt-2 text-center text-[10px] font-semibold leading-4 text-dh-dark-gray">
        Card details stay inside Stripe. Stripe Link can show payment details you saved securely.
      </p>
    </form>
  )
}
