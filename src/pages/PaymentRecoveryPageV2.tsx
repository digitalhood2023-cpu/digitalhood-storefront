import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { AlertCircle, ArrowLeft, CheckCircle2, CreditCard, Loader2, LockKeyhole, Smartphone } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  createRecoveryMobilePayment,
  createRecoveryStripeIntent,
  getPaymentRecoveryDetails,
  verifyRecoveryMobilePayment,
  type PaymentRecoveryOrder,
} from '@/api/paymentRecovery'
import { verifyStripePayment } from '@/api/payments'
import StripeCheckoutForm from '@/components/payments/StripeCheckoutForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAccount } from '@/context/AccountContext'
import Footer from '@/sections/Footer'
import Header from '@/sections/Header'

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

function formatMoney(amount: number, currency = 'ZMW') {
  return currency.toUpperCase() === 'ZMW'
    ? `K${Number(amount || 0).toLocaleString('en-ZM', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : new Intl.NumberFormat('en', { style: 'currency', currency }).format(amount)
}

function detectOperator(phone: string): 'mtn' | 'airtel' {
  const digits = phone.replace(/\D/g, '')
  return /^(260|0)?(97|77)/.test(digits) ? 'airtel' : 'mtn'
}

function formatDeadline(value?: string) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-ZM', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Lusaka',
  }).format(new Date(value))
}

export default function PaymentRecoveryPageV2() {
  const { orderId = '' } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, isLoading: isAccountLoading } = useAccount()
  const pollRef = useRef<number | null>(null)
  const pollAttemptsRef = useRef(0)

  const [order, setOrder] = useState<PaymentRecoveryOrder | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [method, setMethod] = useState<'card' | 'mobile'>('card')
  const [clientSecret, setClientSecret] = useState('')
  const [paymentIntentId, setPaymentIntentId] = useState('')
  const [isPreparingCard, setIsPreparingCard] = useState(false)
  const [phone, setPhone] = useState('')
  const [isStartingMobile, setIsStartingMobile] = useState(false)
  const [mobileReference, setMobileReference] = useState('')
  const [mobileMessage, setMobileMessage] = useState('')
  const [mobileFailed, setMobileFailed] = useState(false)

  const stopPolling = () => {
    if (pollRef.current) window.clearInterval(pollRef.current)
    pollRef.current = null
    pollAttemptsRef.current = 0
  }

  useEffect(() => stopPolling, [])

  useEffect(() => {
    if (isAccountLoading) return
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(`/orders/${orderId}/payment`)}`, { replace: true })
      return
    }

    let active = true
    setIsLoading(true)
    getPaymentRecoveryDetails(orderId)
      .then((response) => {
        if (!active) return
        setOrder(response.order)
        setPhone(response.order.billingPhone || '')
        if (!response.order.eligible) {
          setError(
            response.order.eligibilityCode === 'recovery_expired'
              ? 'The payment window for this order has closed. Please create a new order.'
              : response.order.eligibilityCode === 'already_paid'
                ? 'This order has already been paid.'
                : 'This order cannot currently accept payment.'
          )
        }
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load payment options.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [isAccountLoading, isAuthenticated, navigate, orderId])

  const stripeOptions = useMemo(
    () => clientSecret ? { clientSecret, appearance: { theme: 'stripe' as const, variables: { borderRadius: '10px' } } } : undefined,
    [clientSecret]
  )

  async function prepareCardPayment() {
    if (!order?.eligible || clientSecret || isPreparingCard) return
    setError('')
    setMobileFailed(false)
    setIsPreparingCard(true)
    try {
      const response = await createRecoveryStripeIntent(order.id)
      setClientSecret(response.clientSecret)
      setPaymentIntentId(response.paymentIntentId)
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : 'Unable to prepare card payment.')
    } finally {
      setIsPreparingCard(false)
    }
  }

  useEffect(() => {
    if (order?.eligible && method === 'card' && !clientSecret) void prepareCardPayment()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, order?.id, order?.eligible])

  async function handleStripeSuccess() {
    try {
      const verification = await verifyStripePayment(paymentIntentId)
      if (!verification.success) {
        setError('Your payment is still being confirmed. Refresh the order shortly.')
        return
      }
      setSuccess('Payment confirmed. Your original order is now processing.')
      window.setTimeout(() => navigate(`/orders/${orderId}`), 1000)
    } catch (verificationError) {
      setError(verificationError instanceof Error ? verificationError.message : 'Unable to confirm card payment.')
    }
  }

  function beginMobilePolling(reference: string) {
    stopPolling()
    pollAttemptsRef.current = 0
    pollRef.current = window.setInterval(async () => {
      pollAttemptsRef.current += 1
      try {
        const result = await verifyRecoveryMobilePayment(orderId, reference)
        setMobileMessage(result.message || 'Checking payment status...')

        if (result.paid) {
          stopPolling()
          setSuccess('Payment confirmed. Your original order is now processing.')
          window.setTimeout(() => navigate(`/orders/${orderId}`), 1000)
          return
        }

        if (result.failed || result.terminal) {
          stopPolling()
          setMobileFailed(true)
          setError(result.message || 'The payment was not completed. Try again or choose another method.')
          return
        }

        if (pollAttemptsRef.current >= 24) {
          stopPolling()
          setMobileFailed(true)
          setError('The payment prompt was not confirmed. Try again and approve the new prompt, or choose card payment.')
        }
      } catch (verificationError) {
        const typed = verificationError as Error & { terminal?: boolean }
        if (typed.terminal || pollAttemptsRef.current >= 24) {
          stopPolling()
          setMobileFailed(true)
          setError(typed.message || 'The payment could not be confirmed. Try again or choose another method.')
        }
      }
    }, 5000)
  }

  async function startMobilePayment() {
    if (!order?.eligible || !phone.trim()) return
    stopPolling()
    setError('')
    setSuccess('')
    setMobileFailed(false)
    setMobileMessage('Sending a payment prompt to your phone...')
    setIsStartingMobile(true)
    try {
      const response = await createRecoveryMobilePayment(order.id, {
        phone,
        operator: detectOperator(phone),
      })
      setMobileReference(response.reference)
      setMobileMessage(response.message || 'Check your phone and approve the payment.')

      if (response.paid) {
        setSuccess('Payment confirmed. Your original order is now processing.')
        window.setTimeout(() => navigate(`/orders/${orderId}`), 1000)
      } else if (response.failed || response.terminal) {
        setMobileFailed(true)
        setError(response.message || 'The payment was not completed. Try again or choose another method.')
      } else {
        beginMobilePolling(response.reference)
      }
    } catch (mobileError) {
      const typed = mobileError as Error & { terminal?: boolean }
      setMobileFailed(Boolean(typed.terminal))
      setError(typed.message || 'Unable to start Mobile Money payment.')
    } finally {
      setIsStartingMobile(false)
    }
  }

  function retryMobile() {
    stopPolling()
    setMobileReference('')
    setMobileMessage('')
    setMobileFailed(false)
    setError('')
  }

  return (
    <>
      <Header />
      <main className="min-h-[70vh] bg-slate-50 px-4 py-10 md:py-14">
        <div className="mx-auto max-w-2xl">
          <Link to={`/orders/${orderId}`} className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-dh-primary hover:underline">
            <ArrowLeft className="h-4 w-4" /> Back to order
          </Link>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-slate-950 px-6 py-7 text-white md:px-8">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-white/10 p-3"><LockKeyhole className="h-6 w-6" /></div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">Secure payment</p>
                  <h1 className="mt-1 text-2xl font-black md:text-3xl">Complete your original order</h1>
                  <p className="mt-2 text-sm leading-6 text-white/75">The order owner and amount are verified securely. No duplicate order will be created.</p>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">
              {isLoading || isAccountLoading ? (
                <div className="flex min-h-56 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-dh-primary" /></div>
              ) : (
                <>
                  {order && (
                    <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <div className="flex items-end justify-between gap-4">
                        <div><p className="text-xs font-bold uppercase text-slate-500">Order</p><p className="mt-1 font-black">#{order.number}</p></div>
                        <div className="text-right"><p className="text-xs font-bold uppercase text-slate-500">Amount due</p><p className="mt-1 text-xl font-black">{formatMoney(order.total, order.currency)}</p></div>
                      </div>
                      {order.recoveryExpiresAt && order.eligible && (
                        <p className="mt-4 border-t border-slate-200 pt-3 text-xs font-semibold text-amber-700">Complete payment before {formatDeadline(order.recoveryExpiresAt)}.</p>
                      )}
                    </div>
                  )}

                  {error && <div className="mb-5 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><p>{error}</p></div>}
                  {success && <div className="mb-5 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /><p>{success}</p></div>}

                  {order?.eligible && !success && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => { stopPolling(); setMethod('card'); setError('') }} className={`rounded-2xl border p-4 text-left ${method === 'card' ? 'border-dh-primary bg-dh-primary/5 ring-2 ring-dh-primary/10' : 'border-slate-200'}`}>
                          <CreditCard className="h-5 w-5 text-dh-primary" /><p className="mt-2 font-bold">Card</p><p className="mt-1 text-xs text-slate-500">Secure card payment</p>
                        </button>
                        <button type="button" onClick={() => { setMethod('mobile'); setError('') }} className={`rounded-2xl border p-4 text-left ${method === 'mobile' ? 'border-dh-primary bg-dh-primary/5 ring-2 ring-dh-primary/10' : 'border-slate-200'}`}>
                          <Smartphone className="h-5 w-5 text-dh-primary" /><p className="mt-2 font-bold">Mobile Money</p><p className="mt-1 text-xs text-slate-500">MTN or Airtel Money</p>
                        </button>
                      </div>

                      {method === 'card' && <div className="mt-6">{isPreparingCard && !clientSecret ? <div className="flex items-center justify-center rounded-2xl bg-slate-50 p-8 text-sm font-semibold text-slate-600"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading secure card form...</div> : stripeOptions ? <Elements stripe={stripePromise} options={stripeOptions}><StripeCheckoutForm amount={order.total} onSuccess={handleStripeSuccess} /></Elements> : <Button onClick={prepareCardPayment} className="w-full">Load card form</Button>}</div>}

                      {method === 'mobile' && (
                        <div className="mt-6 space-y-4 rounded-2xl border border-slate-200 p-5">
                          <div><Label htmlFor="recovery-phone">Mobile Money number</Label><Input id="recovery-phone" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="0971 234 567" className="mt-2 h-12" inputMode="tel" /></div>
                          {!mobileReference || mobileFailed ? (
                            <Button type="button" onClick={mobileFailed ? retryMobile : startMobilePayment} disabled={isStartingMobile || !phone.trim()} className="h-12 w-full rounded-xl bg-dh-primary font-bold text-white hover:bg-dh-secondary">
                              {isStartingMobile ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending phone prompt...</> : mobileFailed ? 'Try Mobile Money again' : `Pay ${formatMoney(order.total, order.currency)}`}
                            </Button>
                          ) : (
                            <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900"><p className="font-bold">Check your phone and approve the payment.</p><p className="mt-1">{mobileMessage}</p><div className="mt-3 flex items-center gap-2 text-xs"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Checking for confirmation...</div></div>
                          )}
                          {mobileFailed && <Button type="button" variant="outline" onClick={() => { setMethod('card'); setError(''); setMobileFailed(false) }} className="h-11 w-full">Use card instead</Button>}
                        </div>
                      )}
                    </>
                  )}

                  <p className="mt-7 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-500">DigitalHood verifies the order and payable amount on the server. Sensitive payment credentials are not stored by the storefront.</p>
                </>
              )}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
