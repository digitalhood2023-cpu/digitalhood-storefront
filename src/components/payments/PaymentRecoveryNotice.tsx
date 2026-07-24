import { Clock3, CreditCard } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { getPaymentRecoveryDetails, type PaymentRecoveryOrder } from '@/api/paymentRecovery'
import { useAccount } from '@/context/AccountContext'

function formatDeadline(value?: string) {
  if (!value) return 'the payment window closes'
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

function formatCountdown(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60

  return [
    days ? `${days}d` : '',
    `${String(hours).padStart(2, '0')}h`,
    `${String(minutes).padStart(2, '0')}m`,
    `${String(remainder).padStart(2, '0')}s`,
  ].filter(Boolean).join(' ')
}

export default function PaymentRecoveryNotice() {
  const location = useLocation()
  const { isAuthenticated, isLoading } = useAccount()
  const [order, setOrder] = useState<PaymentRecoveryOrder | null>(null)
  const [remainingSeconds, setRemainingSeconds] = useState(0)

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
        if (!active) return
        const nextOrder = response.order.eligible ? response.order : null
        setOrder(nextOrder)
        setRemainingSeconds(nextOrder?.recoveryRemainingSeconds || 0)
      })
      .catch(() => {
        if (active) setOrder(null)
      })

    return () => {
      active = false
    }
  }, [isAuthenticated, isLoading, orderId])

  useEffect(() => {
    if (!order?.eligible || remainingSeconds <= 0) return
    const timer = window.setInterval(() => {
      setRemainingSeconds((current) => Math.max(0, current - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [order?.eligible, remainingSeconds > 0])

  if (!order?.eligible) return null

  return (
    <section className="mb-6 rounded-3xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-amber-100 p-2.5 text-amber-700">
            <Clock3 className="h-5 w-5" />
          </div>
          <div>
            <p className="font-black text-slate-950">Payment is required for order #{order.number}</p>
            <p className="mt-1 text-sm leading-5 text-slate-700">
              This unpaid order closes automatically at {formatDeadline(order.recoveryExpiresAt)}.
            </p>
            <p className="mt-3 font-mono text-lg font-black tabular-nums text-amber-800" aria-live="polite">
              {remainingSeconds > 0 ? formatCountdown(remainingSeconds) : 'Payment window closed'}
            </p>
          </div>
        </div>

        {remainingSeconds > 0 && (
          <Link
            to={`/orders/${order.id}/payment`}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-dh-primary px-6 text-sm font-black text-white hover:bg-dh-secondary sm:w-auto"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Complete payment
          </Link>
        )}
      </div>
    </section>
  )
}
