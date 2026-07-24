import { Clock3, CreditCard } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { getPaymentRecoveryDetails, type PaymentRecoveryOrder } from '@/api/paymentRecovery'
import { useAccount } from '@/context/AccountContext'

function formatDeadline(value?: string) {
  if (!value) return 'within the payment window'
  try {
    return new Intl.DateTimeFormat('en-ZM', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Africa/Lusaka',
    }).format(new Date(value))
  } catch {
    return value
  }
}

export default function PaymentRecoveryNotice() {
  const location = useLocation()
  const { isAuthenticated, isLoading } = useAccount()
  const [order, setOrder] = useState<PaymentRecoveryOrder | null>(null)

  const match = location.pathname.match(/^\/orders\/(\d+)$/)
  const orderId = match?.[1] || ''

  useEffect(() => {
    if (!orderId || isLoading || !isAuthenticated) {
      setOrder(null)
      return
    }

    let active = true
    getPaymentRecoveryDetails(orderId)
      .then((response) => {
        if (active) setOrder(response.order.eligible ? response.order : null)
      })
      .catch(() => {
        if (active) setOrder(null)
      })

    return () => {
      active = false
    }
  }, [isAuthenticated, isLoading, orderId])

  if (!order?.eligible) return null

  return (
    <div className="fixed inset-x-3 bottom-4 z-[120] mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-white p-4 shadow-2xl md:bottom-6 md:flex md:items-center md:justify-between md:gap-5">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
          <Clock3 className="h-5 w-5" />
        </div>
        <div>
          <p className="font-black text-slate-950">Payment is still required for order #{order.number}</p>
          <p className="mt-1 text-sm leading-5 text-slate-600">
            Your order remains active until {formatDeadline(order.recoveryExpiresAt)}. Complete payment before the window closes.
          </p>
        </div>
      </div>
      <Link
        to={`/orders/${order.id}/payment`}
        className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-dh-primary px-5 text-sm font-bold text-white hover:bg-dh-secondary md:mt-0 md:w-auto"
      >
        <CreditCard className="mr-2 h-4 w-4" />
        Complete payment
      </Link>
    </div>
  )
}
