import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Check, CheckCircle2, CircleDot, Clock3, MapPin, PackageCheck, Radio, ReceiptText, RefreshCw, ShieldAlert, ShoppingBag, Star, Store, Truck } from 'lucide-react'

import { getCustomerOrder } from '@/api/account'
import { getFeedbackEligibilities, type FeedbackEligibility } from '@/api/feedback'
import { getOrderPaymentRecovery } from '@/api/paymentRecovery'
import type { CustomerOrder } from '@/api/orders'
import { Button } from '@/components/ui/button'
import { useAccount } from '@/context/AccountContext'
import { groupOrderItemsByStore } from '@/lib/orderStoreOwnership'
import { getOrderFeedbackProgress } from '@/lib/feedbackProgress'
import { formatOrderDate, formatOrderMoney, getTrackingState, normalizeTrackingStatus, type TrackableOrder } from '@/lib/orderTracking'
import { buildAccountOrderSupportUrl, buildOrderSupportUrl } from '@/lib/supportLinks'
import Footer from '@/sections/Footer'
import Header from '@/sections/Header'

type LocationState = { guestOrder?: CustomerOrder; recoveryToken?: string }

const JOURNEY = [
  { key: 'confirmed', label: 'Confirmed', icon: ReceiptText },
  { key: 'processing', label: 'Processing', icon: Clock3 },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: PackageCheck },
]

function journeyPosition(order: TrackableOrder) {
  const status = normalizeTrackingStatus(order.status)
  if (['delivered', 'completed'].includes(status)) return 3
  if (['shipped', 'out-for-delivery', 'outfordelivery'].includes(status)) return 2
  if (['processing', 'on-hold'].includes(status)) return 1
  return 0
}

function DeliveryAddress({ order }: { order: TrackableOrder }) {
  const address = order.shipping as (NonNullable<TrackableOrder['shipping']> & { mapUrl?: string }) | undefined
  const lines = [
    [address?.firstName, address?.lastName].filter(Boolean).join(' '),
    address?.address1,
    address?.address2,
    [address?.city, address?.province].filter(Boolean).join(', '),
    address?.postcode,
  ].filter(Boolean)

  return (
    <div className="flex items-start gap-3">
      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#f5a623]" />
      <div className="text-sm leading-6 text-slate-600">
        {lines.length ? lines.map((line) => <p key={line}>{line}</p>) : <p>Delivery address unavailable</p>}
        {address?.mapUrl && (
          <a href={address.mapUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block font-bold text-[#28256d] underline">Open directions</a>
        )}
      </div>
    </div>
  )
}

function OrderSummary({
  order,
  isCashOnDelivery,
  isClosed,
}: {
  order: TrackableOrder
  isCashOnDelivery: boolean
  isClosed: boolean
}) {
  const currency = order.currency
  const shippingTotal = Number(order.shippingTotal ?? order.shippingLines?.reduce(
    (sum, line) => sum + Number(line.total || 0),
    0
  ) ?? 0)
  const discountTotal = Number(order.discountTotal || 0)
  const taxTotal = Number(order.taxTotal || 0)
  const feeLines = order.feeLines || []
  const couponLines = order.couponLines || []

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="font-black text-[#16143f]">Order summary</h2>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Products subtotal</dt>
          <dd className="font-bold text-slate-700">{formatOrderMoney(order.subtotal, currency)}</dd>
        </div>

        {couponLines.map((coupon) => (
          <div key={`${coupon.id || coupon.code}`} className="flex justify-between gap-3 text-emerald-700">
            <dt>Coupon {coupon.code ? coupon.code.toUpperCase() : ''}</dt>
            <dd className="font-bold">−{formatOrderMoney(coupon.discount, currency)}</dd>
          </div>
        ))}

        {couponLines.length === 0 && discountTotal > 0 && (
          <div className="flex justify-between gap-3 text-emerald-700">
            <dt>Discount</dt>
            <dd className="font-bold">−{formatOrderMoney(discountTotal, currency)}</dd>
          </div>
        )}

        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Shipping</dt>
          <dd className={`font-bold ${shippingTotal === 0 ? 'text-emerald-700' : 'text-slate-700'}`}>
            {shippingTotal === 0 ? 'Free' : formatOrderMoney(shippingTotal, currency)}
          </dd>
        </div>

        {feeLines.map((fee) => (
          <div key={`${fee.id || fee.name}`} className="flex justify-between gap-3">
            <dt className="text-slate-500">{fee.name || 'Order fee'}</dt>
            <dd className="font-bold text-slate-700">{formatOrderMoney(fee.total, currency)}</dd>
          </div>
        ))}

        {taxTotal > 0 && (
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Tax</dt>
            <dd className="font-bold text-slate-700">{formatOrderMoney(taxTotal, currency)}</dd>
          </div>
        )}

        <div className="mt-3 flex justify-between gap-3 border-t border-slate-200 pt-3">
          <dt className="font-black text-slate-900">Total</dt>
          <dd className="text-base font-black text-slate-900">{formatOrderMoney(order.total, currency)}</dd>
        </div>

        <div className="flex justify-between gap-3 border-t border-slate-100 pt-3">
          <dt className="text-slate-500">Payment</dt>
          <dd className="text-right font-bold text-slate-700">{order.paymentMethodTitle || 'Not available'}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-500">Payment status</dt>
          <dd className="text-right font-bold text-slate-700">
            {order.datePaid
              ? `Paid ${formatOrderDate(order.datePaid)}`
              : isCashOnDelivery
                ? 'Handled on delivery'
                : isClosed
                  ? 'Not paid'
                  : 'Pending'}
          </dd>
        </div>
      </dl>
    </section>
  )
}

export default function OrderTrackingDetailsPage() {
  const { orderId = '' } = useParams()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { isAuthenticated, isLoading: accountLoading } = useAccount()
  const locationState = location.state as LocationState | null
  const guestOrder = locationState?.guestOrder
  const recoveryToken = searchParams.get('token')?.trim() || locationState?.recoveryToken || guestOrder?.recoveryAccess?.token || ''
  const [order, setOrder] = useState<TrackableOrder | null>(guestOrder || null)
  const [loading, setLoading] = useState(Boolean(!guestOrder))
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [refreshNotice, setRefreshNotice] = useState('')
  const [feedbackState, setFeedbackState] = useState<{
    orderId: string
    eligibilities: FeedbackEligibility[]
  } | null>(null)

  useEffect(() => {
    if (accountLoading) return
    if (!isAuthenticated && !recoveryToken) return

    let active = true
    let refreshTimer = 0

    const loadOrder = async (initial = false) => {
      if (!initial && active) setRefreshing(true)

      try {
        const response = isAuthenticated
          ? await getCustomerOrder(orderId)
          : await getOrderPaymentRecovery(orderId, recoveryToken)
        if (!active) return
        setOrder(response.order)
        setError('')
        setRefreshNotice('')
      } catch (requestError) {
        if (!active) return
        const message = requestError instanceof Error ? requestError.message : 'Unable to load this order.'
        if (initial && !guestOrder) setError(message)
        else setRefreshNotice('Live updates are reconnecting. Your last order update is still shown.')
      } finally {
        if (active) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    }

    void loadOrder(true)
    refreshTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadOrder(false)
    }, 15_000)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void loadOrder(false)
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      active = false
      window.clearInterval(refreshTimer)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [accountLoading, guestOrder, isAuthenticated, orderId, recoveryToken])

  useEffect(() => {
    if (
      !isAuthenticated ||
      !order?.id ||
      !['delivered', 'completed'].includes(normalizeTrackingStatus(order.status))
    ) {
      return
    }

    let active = true
    const feedbackOrderId = String(order.id)

    getFeedbackEligibilities({ orderId: order.id, limit: 50 })
      .then((response) => {
        if (active) {
          setFeedbackState({
            orderId: feedbackOrderId,
            eligibilities: response.eligibilities || [],
          })
        }
      })
      .catch(() => {
        if (active) {
          setFeedbackState({ orderId: feedbackOrderId, eligibilities: [] })
        }
      })

    return () => {
      active = false
    }
  }, [isAuthenticated, order?.id, order?.status])

  const groups = useMemo(() => groupOrderItemsByStore(order?.items || []), [order])
  const feedbackReady = feedbackState?.orderId === String(order?.id || '')
  const feedbackProgress = useMemo(
    () => getOrderFeedbackProgress(
      feedbackState?.orderId === String(order?.id || '')
        ? feedbackState.eligibilities
        : [],
      order?.id || orderId
    ),
    [feedbackState, order?.id, orderId]
  )
  const state = order ? getTrackingState(order) : null
  const deliveryTracking = order?.deliveryTracking
  const progress = order ? journeyPosition(order) : 0
  const isCashOnDelivery = Boolean(
    order && ['cod', 'cash_on_delivery'].includes(String(order.paymentMethod || '').toLowerCase())
  )
  const hasOrderAccess = isAuthenticated || Boolean(guestOrder) || Boolean(recoveryToken)
  const displayLoading = accountLoading || ((isAuthenticated || Boolean(recoveryToken)) && loading)
  const displayError = error || (!hasOrderAccess ? 'For privacy, enter the guest order details again to reopen this order.' : '')
  const paymentUrl = order
    ? `/orders/${order.id}/pay${recoveryToken ? `?token=${encodeURIComponent(recoveryToken)}` : ''}`
    : '/track-order'

  return (
    <div className="flex min-h-[100svh] flex-col bg-[#f6f7fb]">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-5 sm:px-5 sm:py-7">
        <Link to="/track-order" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-[#28256d]"><ArrowLeft className="h-4 w-4" /> All orders</Link>

        {displayLoading && <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading order journey…</div>}
        {!displayLoading && displayError && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center"><ShieldAlert className="mx-auto h-7 w-7 text-amber-600" /><p className="mt-2 font-bold text-amber-950">Tracking details are protected</p><p className="mx-auto mt-1 max-w-md text-sm text-amber-800">{displayError}</p><Button asChild className="mt-4 bg-[#28256d] text-white"><Link to="/track-order">Return to tracking</Link></Button></div>
        )}

        {!displayLoading && !displayError && order && state && (
          <>
            <section className="mt-4 overflow-hidden rounded-2xl bg-[#191744] text-white shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
                <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-white/55">{state.trackable ? 'Order journey' : 'Order details'}</p><h1 className="mt-1 text-xl font-black sm:text-2xl">Order #{order.number || order.id}</h1><p className="mt-1 text-sm text-white/65">Placed {formatOrderDate(order.dateCreated, true)}</p></div>
                <span className={`rounded-full px-3 py-1.5 text-xs font-black ${state.closed ? 'bg-white/10 text-white/75' : order.paymentRetry?.eligible ? 'bg-[#f5a623] text-[#191744]' : 'bg-emerald-400/15 text-emerald-200'}`}>{state.label}</span>
              </div>

              {state.closed ? (
                <div className="border-t border-white/10 bg-white/5 p-4 text-sm text-white/70">This order is closed. Tracking and payment actions are no longer available.</div>
              ) : order.paymentRetry?.eligible ? (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#f5a623]/10 p-4"><p className="text-sm text-amber-100">Complete payment before {formatOrderDate(order.paymentRetry.deadline, true)} to confirm this order.</p><Button asChild className="h-9 bg-[#f5a623] font-black text-[#191744] hover:bg-[#ffb536]"><Link to={paymentUrl}>Pay now</Link></Button></div>
              ) : order.paymentRetry?.lifecycle === 'awaiting-verification' ? (
                <div className="border-t border-white/10 bg-white/5 p-4 text-sm text-white/70">DigitalHood is checking the payment provider. Delivery tracking will appear only after payment is confirmed.</div>
              ) : state.trackable ? (
                <div className="grid grid-cols-4 border-t border-white/10 px-2 py-4 sm:px-5">
                  {JOURNEY.map((step, index) => { const Icon = step.icon; const complete = index <= progress; return <div key={step.key} className="relative text-center"><div className={`relative z-10 mx-auto flex h-8 w-8 items-center justify-center rounded-full border ${complete ? 'border-[#f5a623] bg-[#f5a623] text-[#191744]' : 'border-white/20 bg-[#24215b] text-white/40'}`}>{index < progress ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}</div><p className={`mt-2 text-[10px] font-bold sm:text-xs ${complete ? 'text-white' : 'text-white/40'}`}>{step.label}</p>{index < 3 && <span className={`absolute left-[62%] top-4 h-px w-[76%] ${index < progress ? 'bg-[#f5a623]' : 'bg-white/15'}`} />}</div> })}
                </div>
              ) : (
                <div className="border-t border-white/10 bg-white/5 p-4 text-sm text-white/70">This order is available for viewing, but it has no delivery tracking because payment was not confirmed.</div>
              )}
            </section>

            {state.trackable && deliveryTracking && <section className={`mt-4 rounded-2xl border p-4 shadow-sm sm:p-5 ${deliveryTracking.delayed ? 'border-amber-200 bg-amber-50' : deliveryTracking.key === 'delivered' ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${deliveryTracking?.delayed ? 'bg-amber-100 text-amber-700' : deliveryTracking?.key === 'delivered' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-50 text-[#28256d]'}`}>
                    {deliveryTracking?.key === 'delivered' ? <PackageCheck className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
                  </span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Delivery</p>
                    <h2 className="mt-0.5 text-base font-black text-slate-900">{deliveryTracking?.label || state.label}</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                      {deliveryTracking?.message || (order.deliveryEstimate?.label ? `Expected delivery ${order.deliveryEstimate.label}.` : 'Delivery updates will appear here as the order moves.')}
                    </p>
                  </div>
                </div>
                {deliveryTracking?.live && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                    <Radio className="h-3 w-3" /> Live updates
                  </span>
                )}
              </div>
              <div className="mt-4 grid gap-2 border-t border-black/5 pt-3 sm:grid-cols-3">
                <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Expected</p><p className="mt-1 text-sm font-black text-slate-800">{deliveryTracking?.expectedLabel || order.deliveryEstimate?.label || 'Update pending'}</p></div>
                <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Delivered</p><p className="mt-1 text-sm font-black text-slate-800">{deliveryTracking?.deliveredAt ? formatOrderDate(deliveryTracking.deliveredAt, true) : 'Not delivered yet'}</p></div>
                <div><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Last update</p><p className="mt-1 inline-flex items-center gap-1.5 text-sm font-black text-slate-800"><RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> {deliveryTracking?.lastUpdatedAt ? formatOrderDate(deliveryTracking.lastUpdatedAt, true) : refreshing ? 'Refreshing…' : 'Live'}</p></div>
              </div>
              {refreshNotice && <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-xs font-semibold text-amber-800">{refreshNotice}</p>}
            </section>}

            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.75fr)] lg:items-start lg:gap-4">
              <section className="self-start rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                <div className="flex items-center justify-between"><h2 className="font-black text-[#16143f]">Items and sellers</h2><span className="text-xs font-bold text-slate-400">{order.items?.length || 0} item{order.items?.length === 1 ? '' : 's'}</span></div>
                <div className="mt-2.5 space-y-3">
                  {groups.map((group) => (
                    <div key={group.key} className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                      <Link to={group.sellerUrl} className="flex items-center gap-1.5 text-xs font-black text-[#28256d] hover:underline"><Store className="h-3.5 w-3.5" /> {group.storeName}</Link>
                      <div className="mt-1.5 divide-y divide-slate-200">
                        {group.items.map((item) => (
                          <Link key={item.id} to={`/product/${item.productId || item.id}`} className="flex items-center gap-2.5 py-2 hover:text-[#28256d]">
                            {item.image ? <img src={item.image} alt="" className="h-10 w-10 rounded-lg bg-white object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white"><ShoppingBag className="h-4 w-4 text-slate-300" /></span>}
                            <span className="min-w-0 flex-1"><span className="block line-clamp-2 text-sm font-bold text-slate-800">{item.name}</span><span className="mt-0.5 block text-xs text-slate-500">Qty {item.quantity}</span>{feedbackProgress.reviewedOrderItemIds.has(Number(item.id)) && <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-black text-emerald-700"><CheckCircle2 className="h-3 w-3" /> Reviewed</span>}</span>
                            <span className="text-xs font-black text-slate-700">{formatOrderMoney(item.total, order.currency)}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <OrderSummary order={order} isCashOnDelivery={isCashOnDelivery} isClosed={state.closed} />
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="mb-3 flex items-center gap-2 font-black text-[#16143f]"><CalendarDays className="h-4 w-4 text-[#f5a623]" /> Delivery address</h2><DeliveryAddress order={order} /></section>
                {isAuthenticated && ['delivered', 'completed'].includes(normalizeTrackingStatus(order.status)) && feedbackReady && feedbackProgress.pending > 0 && (
                  <section className="rounded-2xl border border-[#f5a623]/30 bg-[#fff8ec] p-3 shadow-sm">
                    <div className="flex gap-2"><Star className="mt-0.5 h-4 w-4 shrink-0 fill-[#f5a623] text-[#f5a623]" /><div><p className="text-sm font-black text-slate-800">{feedbackProgress.submitted > 0 ? 'Finish your feedback' : 'How was your purchase?'}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{feedbackProgress.pending} verified review{feedbackProgress.pending === 1 ? '' : 's'} still available for this order.</p></div></div>
                    <Button asChild className="mt-3 h-9 w-full bg-[#28256d] text-xs font-bold text-white"><Link to={`/account/feedback?order=${encodeURIComponent(String(order.id))}`}>{feedbackProgress.submitted > 0 ? 'Continue feedback' : 'Leave verified feedback'}</Link></Button>
                  </section>
                )}
                {isAuthenticated && ['delivered', 'completed'].includes(normalizeTrackingStatus(order.status)) && feedbackReady && feedbackProgress.pending === 0 && feedbackProgress.submitted > 0 && (
                  <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 shadow-sm">
                    <div className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" /><div><p className="text-sm font-black text-emerald-900">Feedback complete</p><p className="mt-0.5 text-xs leading-5 text-emerald-700">You already reviewed this purchase. Thank you for helping the marketplace.</p></div></div>
                  </section>
                )}
                <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><div className="flex gap-2"><CircleDot className="mt-1 h-4 w-4 shrink-0 text-emerald-500" /><div><p className="text-sm font-black text-slate-800">Need help with this order?</p><p className="mt-0.5 text-xs leading-5 text-slate-500">DigitalHood Support can review payment, seller or delivery issues.</p></div></div>{!state.closed && <Button asChild variant="outline" className="mt-3 h-9 w-full text-xs font-bold"><Link to={isAuthenticated ? buildAccountOrderSupportUrl(order) : buildOrderSupportUrl(order)}>Report an issue</Link></Button>}</section>
              </div>
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}
