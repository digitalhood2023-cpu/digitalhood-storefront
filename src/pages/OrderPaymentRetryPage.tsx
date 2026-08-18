import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Clock3, CreditCard, LockKeyhole, Smartphone, TriangleAlert } from 'lucide-react'

import {
  getCustomerOrder,
  startCustomerOrderPaymentRetry,
  verifyCustomerOrderPaymentRetry,
  type AccountOrder,
  type CustomerOrderPaymentRetryResponse,
} from '@/api/account'
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

export default function OrderPaymentRetryPage() {
  const { orderId = '' } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, isLoading: accountLoading } = useAccount()
  const [order, setOrder] = useState<AccountOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [preparing, setPreparing] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState<CustomerOrderPaymentRetryResponse | null>(null)
  const [phone, setPhone] = useState('')
  const [operator, setOperator] = useState('mtn')
  const [mobileStatus, setMobileStatus] = useState('')

  useEffect(() => {
    if (accountLoading) return
    if (!isAuthenticated) {
      return
    }
    let active = true
    getCustomerOrder(orderId)
      .then((response) => {
        if (!active) return
        setOrder(response.order)
        setPhone(response.order.billing?.phone || '')
      })
      .catch((requestError) => active && setError(requestError instanceof Error ? requestError.message : 'Unable to load this payment.'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [accountLoading, isAuthenticated, orderId])

  useEffect(() => {
    if (retry?.mode !== 'mobile' || !retry.reference) return
    let active = true
    let attempts = 0
    let timeout: number | undefined

    const poll = async () => {
      attempts += 1
      try {
        const result = await verifyCustomerOrderPaymentRetry(orderId, { reference: retry.reference! })
        if (!active) return
        if (result.paid) {
          setMobileStatus('Payment confirmed. Opening your order…')
          window.setTimeout(() => navigate(`/track-order/${orderId}`, { replace: true }), 700)
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
  }, [navigate, orderId, retry])

  const preparePayment = async () => {
    if (!order?.paymentRetry?.eligible) return
    setPreparing(true)
    setError('')
    try {
      const response = await startCustomerOrderPaymentRetry(order.id, {
        clientAttemptId: createAttemptId(),
        ...(order.paymentRetry.method === 'mobile' ? { phone, operator } : {}),
      })
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
      const result = await verifyCustomerOrderPaymentRetry(orderId, { paymentIntentId: retry.paymentIntentId })
      if (!result.paid) throw new Error('The payment has not been confirmed yet.')
      navigate(`/track-order/${orderId}`, { replace: true })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to confirm the payment.')
    }
  }

  const state = order ? getTrackingState(order) : null
  const unavailable = Boolean(order && (!order.paymentRetry?.eligible || state?.closed))
  const displayLoading = accountLoading || (isAuthenticated && loading)

  return (
    <div className="flex min-h-[100svh] flex-col bg-[#f6f7fb]">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-3 py-5 sm:px-5 sm:py-7">
        <Link to="/track-order" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-[#28256d]"><ArrowLeft className="h-4 w-4" /> Back to orders</Link>
        {displayLoading && <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Checking secure payment window…</div>}

        {!displayLoading && !isAuthenticated && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center"><LockKeyhole className="mx-auto h-7 w-7 text-amber-700" /><h1 className="mt-2 text-lg font-black text-amber-950">Sign in to retry payment</h1><p className="mt-1 text-sm text-amber-800">Payment retries are protected by your DigitalHood account.</p><Button asChild className="mt-4 bg-[#28256d] text-white"><Link to={`/login?redirect=${encodeURIComponent(`/orders/${orderId}/pay`)}`}>Sign in</Link></Button></div>
        )}

        {!displayLoading && error && <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

        {!displayLoading && order && (
          <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-[#191744] p-4 text-white sm:p-5">
              <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-white/55">Secure payment retry</p><h1 className="mt-1 text-xl font-black">Order #{order.number || order.id}</h1></div><span className="rounded-full bg-[#f5a623] px-3 py-1 text-xs font-black text-[#191744]">{formatOrderMoney(order.total, order.currency)}</span></div>
              {order.paymentRetry?.deadline && <p className="mt-3 flex items-center gap-1.5 text-xs text-white/70"><Clock3 className="h-3.5 w-3.5 text-[#f5a623]" /> Pay before {formatOrderDate(order.paymentRetry.deadline, true)}</p>}
            </div>

            {unavailable ? (
              <div className="p-5 text-center"><TriangleAlert className="mx-auto h-7 w-7 text-slate-400" /><h2 className="mt-2 font-black text-slate-800">Payment retry unavailable</h2><p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{order.paymentRetry?.message || 'This order is closed or no longer inside its payment window.'}</p><Button asChild variant="outline" className="mt-4"><Link to="/track-order">Return to orders</Link></Button></div>
            ) : (
              <div className="p-4 sm:p-5">
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
