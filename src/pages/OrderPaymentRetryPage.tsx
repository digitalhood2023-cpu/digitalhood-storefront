import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Clock3, CreditCard, LockKeyhole, Smartphone, TriangleAlert } from 'lucide-react'

import {
  type AccountOrder,
  type CustomerOrderPaymentRetryResponse,
} from '@/api/account'
import {
  getOrderPaymentRecovery,
  startOrderPaymentRecovery,
  verifyOrderPaymentRecovery,
} from '@/api/paymentRecovery'
import StripeCheckoutForm from '@/components/payments/StripeCheckoutForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAccount } from '@/context/AccountContext'
import { formatOrderDate, formatOrderMoney, getTrackingState } from '@/lib/orderTracking'
import Footer from '@/sections/Footer'
import Header from '@/sections/Header'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

function createAttemptId() {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `retry-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function formatCountdown(deadline?: string | null) {
  const milliseconds = deadline ? new Date(deadline).getTime() - Date.now() : 0
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`
}

export default function OrderPaymentRetryPage() {
  const { orderId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { isAuthenticated, isLoading: accountLoading } = useAccount()
  const recoveryToken = searchParams.get('token')?.trim() || ''
  const [order, setOrder] = useState<AccountOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [preparing, setPreparing] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState<CustomerOrderPaymentRetryResponse | null>(null)
  const [phone, setPhone] = useState('')
  const [operator, setOperator] = useState('mtn')
  const [mobileStatus, setMobileStatus] = useState('')
  const [countdown, setCountdown] = useState('0d 00h 00m 00s')

  useEffect(() => {
    if (accountLoading) return
    if (!isAuthenticated && !recoveryToken) return
    let active = true
    let refreshTimer = 0

    const loadRecoveryOrder = async (initial = false) => {
      try {
        const response = await getOrderPaymentRecovery(orderId, recoveryToken)
        if (!active) return
        setOrder(response.order)
        if (initial) {
          setPhone((current) => current || response.order.billing?.phone || '')
        }
        setError('')
      } catch (requestError) {
        if (active && initial) {
          setError(requestError instanceof Error ? requestError.message : 'Unable to load this payment.')
        }
      } finally {
        if (active && initial) setLoading(false)
      }
    }

    void loadRecoveryOrder(true)
    refreshTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadRecoveryOrder()
    }, 10_000)

    return () => {
      active = false
      window.clearInterval(refreshTimer)
    }
  }, [accountLoading, isAuthenticated, orderId, recoveryToken])

  useEffect(() => {
    const update = () => setCountdown(formatCountdown(order?.paymentRetry?.deadline))
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [order?.paymentRetry?.deadline])

  useEffect(() => {
    if (retry?.mode !== 'mobile' || !retry.reference) return
    let active = true
    let attempts = 0
    let timeout: number | undefined

    const poll = async () => {
      attempts += 1
      try {
        const result = await verifyOrderPaymentRecovery(
          orderId,
          { reference: retry.reference! },
          recoveryToken
        )
        if (!active) return
        if (result.paid) {
          setMobileStatus('Payment confirmed. Opening your order…')
          if (isAuthenticated) {
            window.setTimeout(() => navigate(`/track-order/${orderId}`, { replace: true }), 700)
          } else {
            window.setTimeout(
              () => navigate(
                `/track-order/${orderId}?token=${encodeURIComponent(recoveryToken)}`,
                { replace: true }
              ),
              700
            )
          }
          return
        }
        if (result.failed) {
          setMobileStatus('Payment was not approved. You can try again while the payment window remains open.')
          setRetry(null)
          return
        }
        setMobileStatus('Waiting for approval on your phone…')
      } catch {
        if (active) setMobileStatus('Still waiting for the payment provider…')
      }

      if (active && attempts < 36) timeout = window.setTimeout(poll, 5000)
      else if (active) setMobileStatus('Approval is taking longer than expected. You can safely return and check this order again.')
    }

    timeout = window.setTimeout(poll, 2500)
    return () => { active = false; if (timeout) window.clearTimeout(timeout) }
  }, [isAuthenticated, navigate, orderId, recoveryToken, retry])

  const preparePayment = async () => {
    if (!order?.paymentRetry?.eligible) return
    setPreparing(true)
    setError('')
    try {
      const response = await startOrderPaymentRecovery(
        order.id,
        {
          clientAttemptId: createAttemptId(),
          ...(order.paymentRetry.method === 'mobile' ? { phone, operator } : {}),
        },
        recoveryToken
      )
      setRetry(response)
      if (response.mode === 'mobile') setMobileStatus(response.message || 'Approve the payment prompt on your phone.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to prepare payment. Please try again.')
    } finally {
      setPreparing(false)
    }
  }

  const confirmCardPayment = async () => {
    if (!retry?.paymentIntentId) return
    try {
      const result = await verifyOrderPaymentRecovery(
        orderId,
        { paymentIntentId: retry.paymentIntentId },
        recoveryToken
      )
      if (!result.paid) throw new Error('The payment has not been confirmed yet.')
      if (isAuthenticated) {
        navigate(`/track-order/${orderId}`, { replace: true })
      } else {
        navigate(
          `/track-order/${orderId}?token=${encodeURIComponent(recoveryToken)}`,
          { replace: true }
        )
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to confirm the payment.')
    }
  }

  const state = order ? getTrackingState(order) : null
  const unavailable = Boolean(order && (!order.paymentRetry?.eligible || state?.closed))
  const hasRecoveryAccess = isAuthenticated || Boolean(recoveryToken)
  const awaitingVerification = order?.paymentRetry?.lifecycle === 'awaiting-verification'
  const displayLoading = accountLoading || (hasRecoveryAccess && loading)

  return (
    <div className="flex min-h-[100svh] flex-col bg-[#f6f7fb]">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-3 py-5 sm:px-5 sm:py-7">
        <Link to="/track-order" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-[#28256d]"><ArrowLeft className="h-4 w-4" /> Back to orders</Link>
        {displayLoading && <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Checking secure payment window…</div>}

        {!displayLoading && !hasRecoveryAccess && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center"><LockKeyhole className="mx-auto h-7 w-7 text-amber-700" /><h1 className="mt-2 text-lg font-black text-amber-950">Sign in to retry payment</h1><p className="mt-1 text-sm text-amber-800">Payment retries are protected by your DigitalHood account.</p><Button asChild className="mt-4 bg-[#28256d] text-white"><Link to={`/login?redirect=${encodeURIComponent(`/orders/${orderId}/pay`)}`}>Sign in</Link></Button></div>
        )}

        {!displayLoading && error && <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

        {!displayLoading && order && (
          <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-[#191744] p-4 text-white sm:p-5">
              <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-white/55">Secure payment retry</p><h1 className="mt-1 text-xl font-black">Order #{order.number || order.id}</h1></div><span className="rounded-full bg-[#f5a623] px-3 py-1 text-xs font-black text-[#191744]">{formatOrderMoney(order.total, order.currency)}</span></div>
              {order.paymentRetry?.deadline && <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"><p className="flex items-center gap-1.5 text-xs text-white/70"><Clock3 className="h-3.5 w-3.5 text-[#f5a623]" /> Pay before {formatOrderDate(order.paymentRetry.deadline, true)}</p><p className="mt-1 font-mono text-lg font-black tracking-tight text-[#f5a623]" aria-live="polite">{countdown}</p></div>}
            </div>

            {awaitingVerification ? (
              <div className="p-5 text-center"><Clock3 className="mx-auto h-7 w-7 animate-pulse text-[#28256d]" /><h2 className="mt-2 font-black text-slate-800">Checking payment confirmation</h2><p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">This order only shows Awaiting payment while DigitalHood checks the payment provider. If it is not confirmed in the short verification window, this page will change to Pay now and the 72-hour recovery window remains available.</p></div>
            ) : unavailable ? (
              <div className="p-5 text-center"><TriangleAlert className="mx-auto h-7 w-7 text-slate-400" /><h2 className="mt-2 font-black text-slate-800">Payment retry unavailable</h2><p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{order.paymentRetry?.message || 'This order is closed or no longer inside its payment window.'}</p><Button asChild variant="outline" className="mt-4"><Link to="/track-order">Return to orders</Link></Button></div>
            ) : (
              <div className="p-4 sm:p-5">
                {order.inventoryReservation?.reserved && <div className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-semibold leading-6 text-emerald-800">{order.inventoryReservation.message} No seller action is needed.</div>}
                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#28256d] shadow-sm">{order.paymentRetry?.method === 'card' ? <CreditCard className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}</div><div><p className="text-sm font-black text-slate-800">{order.paymentRetry?.method === 'card' ? 'Card payment' : 'Mobile Money'}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">The amount comes directly from your order and cannot be changed on this page.</p></div></div>

                {!retry && order.paymentRetry?.method === 'mobile' && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_150px]">
                    <div><Label htmlFor="retry-phone">Mobile Money number</Label><Input id="retry-phone" value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1.5 h-11" placeholder="0971234567" /></div>
                    <div><Label htmlFor="retry-network">Network</Label><select id="retry-network" value={operator} onChange={(event) => setOperator(event.target.value)} className="mt-1.5 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="mtn">MTN MoMo</option><option value="airtel">Airtel Money</option></select></div>
                  </div>
                )}

                {!retry && <Button type="button" onClick={preparePayment} disabled={preparing || (order.paymentRetry?.method === 'mobile' && !phone.trim())} className="mt-4 h-11 w-full rounded-xl bg-[#f5a623] font-black text-[#191744] hover:bg-[#ffb536]">{preparing ? 'Preparing secure payment…' : order.paymentRetry?.method === 'card' ? 'Continue to secure card payment' : 'Send Mobile Money prompt'}</Button>}

                {retry?.mode === 'card' && retry.clientSecret && (
                  <Elements stripe={stripePromise} options={{ clientSecret: retry.clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#28256d', borderRadius: '10px' } } }}><StripeCheckoutForm amount={retry.amount} onSuccess={confirmCardPayment} /></Elements>
                )}

                {retry?.mode === 'mobile' && (
                  <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-5 text-center"><span className="mx-auto flex h-10 w-10 animate-pulse items-center justify-center rounded-full bg-[#28256d] text-white"><Smartphone className="h-5 w-5" /></span><p className="mt-3 font-black text-[#191744]">Check your phone</p><p className="mt-1 text-sm leading-6 text-slate-600">{mobileStatus}</p><p className="mt-2 text-xs font-bold text-slate-400">Reference {retry.reference}</p></div>
                )}

                <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-400"><LockKeyhole className="h-3.5 w-3.5" /> DigitalHood rechecks account ownership and payment status before updating this order.</p>
              </div>
            )}
          </section>
        )}
      </main>
      <Footer />
    </div>
  )
}
