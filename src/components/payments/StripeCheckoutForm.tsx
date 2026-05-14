import {
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js'
import { useState } from 'react'

import { Button } from '@/components/ui/button'

type StripeCheckoutFormProps = {
  amount: number
  onSuccess: () => void
}

export default function StripeCheckoutForm({
  amount,
  onSuccess,
}: StripeCheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()

  const [error, setError] = useState('')
  const [isPaying, setIsPaying] = useState(false)

  const handleSubmit = async () => {
    if (!stripe || !elements) return

    setError('')
    setIsPaying(true)

    const result = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })

    if (result.error) {
      setError(result.error.message || 'Payment failed.')
      setIsPaying(false)
      return
    }

    onSuccess()
    setIsPaying(false)
  }

  return (
    <div className="mt-6 rounded-xl border border-dh-light-gray bg-white p-4">
      <PaymentElement />

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={!stripe || !elements || isPaying}
        className="mt-5 w-full bg-dh-primary hover:bg-dh-secondary text-white h-12 rounded-xl font-semibold"
      >
        {isPaying ? 'Processing Card...' : `Pay K${amount.toFixed(2)}`}
      </Button>
    </div>
  )
}
