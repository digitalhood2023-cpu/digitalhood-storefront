import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  createRecoveryLencoPayment,
  createRecoveryStripeIntent,
  getPaymentRecoveryDetails,
  verifyRecoveryLencoPayment,
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
  if (currency.toUpperCase() === 'ZMW') {
    return `K${Number(amount || 0).toLocaleString('en-ZM', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
  }).format(amount)
}

function detectOperator(phone: string): 'mtn' | 'airtel' {
  const digits = phone.replace(/\D/g, '')
  return /^(260|0)?(97|77)/.test(digits) ? 'airtel' : 'mtn'
}

export default function PaymentRecoveryPage() {
  const { orderId = '' } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, isLoading: isAccountLoading } = useAccount()
  const pollRef = useRef<number | null>(null)

  const [order, setOrder] = useState<PaymentRecoveryOrder | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [method, setMethod] = useState<'stripe' | 'lenco'>('stripe')

  const [isPreparingCard, setIsPreparingCard] = useState(false)
  const [clientSecret, setClientSecret] = useState('')
  const [paymentIntentId, setPaymentIntentId] = useState('')

  const [phone, setPhone] = useState('')
  const [isStartingMobile, setIsStartingMobile] = useState(false)
  const [mobileReference, setMobileReference] = useState('')
  const [mobileStatus, setMobileStatus] = useState('')

  const stopPolling = () => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  useEffect(() => stopPolling, [])

  useEffect(() => {
    if (isAccountLoading) return

    if (!isAuthenticated) {
      navigate(
        `/login?redirect=${encodeURIComponent(`/orders/${orderId}/payment`)}`,
        { replace: true }
      )
      return
    }

    let cancelled = false

    async function loadRecovery() {
      setIsLoading(true)
      setError('')

      try {
        const response = await getPaymentRecoveryDetails(orderId)
        if (cancelled) return

        setOrder(response.order)
        setPhone(response.order.billingPhone || '')

        if (!response.order.eligible) {
          if (response.order.eligibilityCode === 'already_paid') {
            setSuccess('This order has already been paid successfully.')
          } else {
            setError('This order is not currently eligible for payment retry.')
          }
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load this payment.'
          )
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadRecovery()

    return () => {
      cancelled = true
    }
  }, [isAccountLoading, isAuthenticated, navigate, orderId])

  const stripeOptions = useMemo(
    () =>
      clientSecret
        ? {
            clientSecret,
            appearance: {
              theme: 'stripe' as const,
              variables: {
                borderRadius: '10px',
              },
            },
          }
        : undefined,
    [clientSecret]
  )

  async function prepareCardPayment() {
    if (!order?.eligible) return

    setError('')
    setSuccess('')
    setIsPreparingCard(true)

    try {
      const response = await createRecoveryStripeIntent(order.id)
      setClientSecret(response.clientSecret)
      setPaymentIntentId(response.paymentIntentId)
    } catch (prepareError) {
      setError(
        prepareError instanceof Error
          ? prepareError.message
          : 'Unable to prepare card payment.'
      )
    } finally {
      setIsPreparingCard(false)
    }
  }

  async function handleStripeSuccess() {
    setError('')

    try {
      const verification = await verifyStripePayment(paymentIntentId)

      if (!verification.success) {
        setError('The card payment is still being confirmed. Please try again shortly.')
        return
      }

      setSuccess('Payment confirmed. Your original order is now processing.')
      window.setTimeout(() => navigate(`/orders/${orderId}`), 1200)
    } catch (verificationError) {
      setError(
        verificationError instanceof Error
          ? verificationError.message
          : 'Unable to verify the card payment.'
      )
    }
  }

  function beginMobilePolling(reference: string) {
    stopPolling()

    pollRef.current = window.setInterval(async () => {
      try {
        const result = await verifyRecoveryLencoPayment(orderId, reference)
        setMobileStatus(result.status)

        if (result.paid) {
          stopPolling()
          setSuccess('Mobile Money payment confirmed. Your original order is now processing.')
          window.setTimeout(() => navigate(`/orders/${orderId}`), 1200)
        }
      } catch {
        // Keep polling. The customer may still be completing the phone prompt.
      }
    }, 6000)
  }

  async function startMobilePayment() {
    if (!order?.eligible) return

    setError('')
    setSuccess('')
    setIsStartingMobile(true)

    try {
      const response = await createRecoveryLencoPayment(order.id, {
        phone,
        operator: detectOperator(phone),
      })

      setMobileReference(response.reference)
      setMobileStatus(response.status || 'initiated')
      beginMobilePolling(response.reference)
    } catch (mobileError) {
      setError(
        mobileError instanceof Error
          ? mobileError.message
          : 'Unable to start Mobile Money payment.'
      )
    } finally {
      setIsStartingMobile(false)
    }
  }

  return (
    <>
      <Header />

      <main className="min-h-[70vh] bg-slate-50 px-4 py-10 md:py-14">
        <div className="mx-auto max-w-2xl">
          <Link
            to={`/orders/${orderId}`}
            className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-dh-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to order
          </Link>

          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-gradient-to-br from-slate-950 to-slate-800 px-6 py-7 text-white md:px-8">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-white/10 p-3">
                  <LockKeyhole className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">
                    Secure payment recovery
                  </p>
                  <h1 className="mt-1 text-2xl font-black md:text-3xl">
                    Complete your original order
                  </h1>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">
                    DigitalHood verifies the order owner and amount on the server.
                    This payment will not create another order.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 md:p-8">
              {isLoading || isAccountLoading ? (
                <div className="flex min-h-56 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-dh-primary" />
                </div>
              ) : (
                <>
                  {order && (
                    <div className="mb-6 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Order
                        </p>
                        <p className="mt-1 font-black text-slate-950">
                          #{order.number}
                        </p>
                      </div>
                      <div className="sm:text-right">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                          Amount due
                        </p>
                        <p className="mt-1 text-xl font-black text-slate-950">
                          {formatMoney(order.total, order.currency)}
                        </p>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="mb-5 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                      <p>{error}</p>
                    </div>
                  )}

                  {success && (
                    <div className="mb-5 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                      <p>{success}</p>
                    </div>
                  )}

                  {order?.eligible && !success && (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setMethod('stripe')}
                          className={`rounded-2xl border p-4 text-left transition ${
                            method === 'stripe'
                              ? 'border-dh-primary bg-dh-primary/5 ring-2 ring-dh-primary/10'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <CreditCard className="h-5 w-5 text-dh-primary" />
                          <p className="mt-2 font-bold text-slate-950">Card</p>
                          <p className="mt-1 text-xs text-slate-500">Secure Stripe payment</p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setMethod('lenco')}
                          className={`rounded-2xl border p-4 text-left transition ${
                            method === 'lenco'
                              ? 'border-dh-primary bg-dh-primary/5 ring-2 ring-dh-primary/10'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <Smartphone className="h-5 w-5 text-dh-primary" />
                          <p className="mt-2 font-bold text-slate-950">Mobile Money</p>
                          <p className="mt-1 text-xs text-slate-500">MTN or Airtel Money</p>
                        </button>
                      </div>

                      {method === 'stripe' && (
                        <div className="mt-6">
                          {!clientSecret ? (
                            <Button
                              type="button"
                              onClick={prepareCardPayment}
                              disabled={isPreparingCard}
                              className="h-12 w-full rounded-xl bg-dh-primary font-bold text-white hover:bg-dh-secondary"
                            >
                              {isPreparingCard ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Preparing secure payment...
                                </>
                              ) : (
                                `Continue with card — ${formatMoney(
                                  order.total,
                                  order.currency
                                )}`
                              )}
                            </Button>
                          ) : (
                            stripeOptions && (
                              <Elements stripe={stripePromise} options={stripeOptions}>
                                <StripeCheckoutForm
                                  amount={order.total}
                                  onSuccess={handleStripeSuccess}
                                />
                              </Elements>
                            )
                          )}
                        </div>
                      )}

                      {method === 'lenco' && (
                        <div className="mt-6 space-y-4 rounded-2xl border border-slate-200 p-5">
                          <div>
                            <Label htmlFor="recovery-phone">Mobile Money number</Label>
                            <Input
                              id="recovery-phone"
                              value={phone}
                              onChange={(event) => setPhone(event.target.value)}
                              placeholder="0971 234 567"
                              className="mt-2 h-12"
                              inputMode="tel"
                            />
                          </div>

                          <Button
                            type="button"
                            onClick={startMobilePayment}
                            disabled={isStartingMobile || !phone.trim()}
                            className="h-12 w-full rounded-xl bg-dh-primary font-bold text-white hover:bg-dh-secondary"
                          >
                            {isStartingMobile ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending phone prompt...
                              </>
                            ) : (
                              `Pay ${formatMoney(order.total, order.currency)}`
                            )}
                          </Button>

                          {mobileReference && (
                            <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                              <p className="font-bold">Check your phone and approve the payment.</p>
                              <p className="mt-1">Status: {mobileStatus || 'waiting'}</p>
                              <div className="mt-3 flex items-center gap-2 text-xs">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                DigitalHood is checking for confirmation automatically.
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}

                  <div className="mt-7 flex items-start gap-3 border-t border-slate-100 pt-5 text-xs leading-5 text-slate-500">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    <p>
                      The amount shown here comes directly from your DigitalHood order.
                      Payment details are processed by Stripe or Lenco and are not stored by
                      the storefront.
                    </p>
                  </div>
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
