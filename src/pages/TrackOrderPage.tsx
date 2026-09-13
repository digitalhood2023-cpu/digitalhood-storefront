import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Clock3, PackageCheck, Search, ShieldCheck, ShoppingBag, Truck } from 'lucide-react'

import { getCustomerOrders, type AccountOrder } from '@/api/account'
import { lookupCustomerOrder } from '@/api/orders'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAccount } from '@/context/AccountContext'
import { formatOrderDate, formatOrderMoney, getTrackingState, type TrackingCategory } from '@/lib/orderTracking'
import { buildAccountOrderSupportUrl } from '@/lib/supportLinks'
import Footer from '@/sections/Footer'
import Header from '@/sections/Header'

const PAGE_SIZE = 10
const FILTERS: Array<{ value: TrackingCategory; label: string; icon: typeof ShoppingBag }> = [
  { value: 'all', label: 'All orders', icon: ShoppingBag },
  { value: 'in-progress', label: 'In progress', icon: Clock3 },
  { value: 'shipped', label: 'Shipped', icon: Truck },
  { value: 'delivered', label: 'Delivered', icon: PackageCheck },
]

function OrderThumbnail({ order }: { order: AccountOrder }) {
  const [failed, setFailed] = useState(false)
  const image = order.items?.[0]?.image
  if (!image || failed) {
    return <div className="dh-order-thumbnail flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"><ShoppingBag className="h-5 w-5" /></div>
  }
  return <img src={image} alt="" className="dh-order-item-image h-14 w-14 shrink-0 rounded-xl object-cover" onError={() => setFailed(true)} />
}

function SignedInOrders() {
  const [orders, setOrders] = useState<AccountOrder[]>([])
  const [category, setCategory] = useState<TrackingCategory>('all')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState({ all: 0, inProgress: 0, shipped: 0, delivered: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const nextQuery = search.trim()
    if (nextQuery === query) return

    const timeout = window.setTimeout(() => {
      setLoading(true)
      setError('')
      setQuery(nextQuery)
      setPage(1)
    }, 280)
    return () => window.clearTimeout(timeout)
  }, [query, search])

  useEffect(() => {
    let active = true
    getCustomerOrders({ page, perPage: PAGE_SIZE, category, search: query })
      .then((response) => {
        if (!active) return
        setOrders(response.orders || [])
        setTotalPages(Math.max(1, response.totalPages || 1))
        setTotal(response.total ?? response.orders?.length ?? 0)
        if (response.counts) {
          setCounts({
            all: response.counts.all || 0,
            inProgress: response.counts.inProgress || 0,
            shipped: response.counts.shipped || 0,
            delivered: response.counts.delivered || 0,
          })
        }
      })
      .catch((requestError) => {
        if (!active) return
        setError(requestError instanceof Error ? requestError.message : 'Unable to load your orders.')
        setOrders([])
      })
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [category, page, query])

  const filterCounts = useMemo<Record<TrackingCategory, number>>(() => ({
    all: counts.all,
    'in-progress': counts.inProgress,
    shipped: counts.shipped,
    delivered: counts.delivered,
  }), [counts])

  return (
    <main className="mx-auto w-full max-w-5xl px-3 py-5 sm:px-5 sm:py-7">
      <div className="dh-order-card rounded-2xl p-3 shadow-sm sm:p-4">
        <div className="relative">
          <Search className="dh-order-card-subtle pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search order number or product" aria-label="Search your orders" className="h-11 rounded-xl pl-9" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Order filters">
          {FILTERS.map((filter) => {
            const Icon = filter.icon
            const active = category === filter.value
            return (
              <button key={filter.value} type="button" onClick={() => { if (active) return; setLoading(true); setError(''); setCategory(filter.value); setPage(1) }} aria-pressed={active} className={`dh-order-filter flex min-h-10 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-bold transition sm:text-sm ${active ? 'dh-order-filter--active' : ''}`}>
                <Icon className="h-3.5 w-3.5" /><span>{filter.label}</span>
                <span className={active ? 'text-white/75' : 'dh-order-card-subtle'}>{filterCounts[filter.value]}</span>
              </button>
            )
          })}
        </div>
      </div>

      <section className="mt-4 space-y-2.5" aria-live="polite" aria-busy={loading}>
        {loading && <div className="dh-order-card dh-order-card-copy rounded-2xl p-8 text-center text-sm">Loading orders…</div>}
        {!loading && error && <div className="dh-order-alert dh-order-alert--danger rounded-2xl p-4 text-sm">{error}</div>}
        {!loading && !error && orders.length === 0 && (
          <div className="dh-order-card rounded-2xl p-8 text-center"><ShoppingBag className="dh-order-card-subtle mx-auto h-7 w-7" /><p className="dh-order-card-title mt-2 font-bold">No matching orders</p><p className="dh-order-card-copy mt-1 text-sm">Try another search or status.</p></div>
        )}
        {!loading && !error && orders.map((order) => {
          const state = getTrackingState(order)
          const firstItem = order.items?.[0]
          const extraItems = Math.max(0, (order.items?.length || 0) - 1)
          return (
            <article key={order.id} className="dh-order-card rounded-2xl p-3 shadow-sm sm:p-4">
              <div className="flex items-start gap-3">
                <OrderThumbnail order={order} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <p className="dh-order-card-title text-sm font-black">Order #{order.number || order.id}</p>
                    <span className={`dh-order-status rounded-full px-2.5 py-1 text-[11px] font-extrabold ${state.closed ? 'dh-order-status--closed' : order.paymentRetry?.eligible ? 'dh-order-status--warning' : state.category === 'delivered' ? 'dh-order-status--success' : 'dh-order-status--active'}`}>{state.label}</span>
                  </div>
                  <p className="dh-order-card-value mt-1 truncate text-sm font-semibold">{firstItem?.name || 'Marketplace order'}{extraItems > 0 ? ` +${extraItems} more` : ''}</p>
                  <div className="dh-order-card-copy mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs"><span>{formatOrderDate(order.dateCreated)}</span><span className="dh-order-card-value font-bold">{formatOrderMoney(order.total, order.currency)}</span><span>{order.paymentMethodTitle || 'Payment method unavailable'}</span></div>
                </div>
              </div>
              <div className="dh-order-card-divider mt-3 flex flex-wrap items-center justify-end gap-2 border-t pt-3">
                {!state.closed && <Link to={buildAccountOrderSupportUrl(order)} className="dh-order-action-link rounded-lg px-3 py-2 text-xs font-bold">Report issue</Link>}
                {order.paymentRetry?.eligible ? (
                  <Button asChild className="h-9 rounded-lg bg-[#f5a623] px-4 text-xs font-black text-[#16143f] hover:bg-[#ffb536]"><Link to={`/orders/${order.id}/pay`}>Pay now <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button>
                ) : state.trackable ? (
                  <Button asChild className="h-9 rounded-lg bg-[#28256d] px-4 text-xs font-black text-white hover:bg-[#1d1b55]"><Link to={`/track-order/${order.id}`}>Track order <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button>
                ) : (
                  <Button asChild variant="outline" className="h-9 rounded-lg px-4 text-xs font-black"><Link to={`/track-order/${order.id}`}>View order details <ArrowRight className="ml-1 h-3.5 w-3.5" /></Link></Button>
                )}
              </div>
            </article>
          )
        })}
      </section>

      {!loading && !error && total > 0 && (
        <div className="dh-order-card mt-4 flex items-center justify-between rounded-xl px-3 py-2.5">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => { setLoading(true); setError(''); setPage((value) => value - 1) }}><ArrowLeft className="mr-1 h-4 w-4" /> Previous</Button>
          <span className="dh-order-card-copy text-xs font-bold">Page {page} of {totalPages} · {total} orders</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => { setLoading(true); setError(''); setPage((value) => value + 1) }}>Next <ArrowRight className="ml-1 h-4 w-4" /></Button>
        </div>
      )}
    </main>
  )
}

function GuestOrderLookup() {
  const navigate = useNavigate()
  const [orderNumber, setOrderNumber] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLoading(true); setError('')
    try {
      const response = await lookupCustomerOrder({ email: email.trim(), orderNumber: orderNumber.trim() })
      navigate(`/track-order/${response.order.id}`, {
        state: {
          guestOrder: response.order,
          recoveryToken: response.order.recoveryAccess?.token || '',
        },
      })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Order not found. Check your details and try again.')
    } finally { setLoading(false) }
  }

  return (
    <main className="mx-auto w-full max-w-lg px-3 py-7 sm:px-5 sm:py-10">
      <div className="dh-order-card rounded-2xl p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#28256d] text-white"><Truck className="h-5 w-5" /></div><div><h1 className="dh-order-card-title text-xl font-black">Find a guest order</h1><p className="dh-order-card-copy text-sm">Use the details supplied at checkout.</p></div></div>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <div><Label htmlFor="tracking-order">Order number</Label><Input id="tracking-order" value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} required className="mt-1.5 h-11" placeholder="e.g. 1542" /></div>
          <div><Label htmlFor="tracking-email">Checkout email</Label><Input id="tracking-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="mt-1.5 h-11" placeholder="you@example.com" /></div>
          {error && <p className="dh-order-alert dh-order-alert--danger rounded-xl p-3 text-sm">{error}</p>}
          <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl bg-[#28256d] font-bold text-white hover:bg-[#1d1b55]">{loading ? 'Finding order…' : 'View order details'}</Button>
        </form>
        <div className="dh-order-alert dh-order-alert--warning mt-5 flex items-start gap-2 rounded-xl p-3 text-xs leading-5"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><span>Have an account? <Link to="/login?redirect=/track-order" className="font-black underline">Sign in</Link> to see every order without entering these details.</span></div>
      </div>
    </main>
  )
}

export default function TrackOrderPage() {
  const { isAuthenticated, isLoading } = useAccount()
  return <div className="dh-order-tracking-page flex min-h-[100svh] flex-col"><Header /><div className="flex-1">{isLoading ? <div className="dh-order-card-copy mx-auto max-w-5xl px-4 py-14 text-center text-sm">Loading secure tracking…</div> : isAuthenticated ? <SignedInOrders /> : <GuestOrderLookup />}</div><Footer /></div>
}
