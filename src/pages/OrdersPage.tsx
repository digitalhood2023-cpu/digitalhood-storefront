import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Loader2,
  Package,
  PackageCheck,
  Search,
  ShoppingBag,
  Star,
  Truck,
} from 'lucide-react'

import Header from '@/sections/Header'
import Footer from '@/sections/Footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAccount } from '@/context/AccountContext'
import { getCustomerOrders, type AccountOrder } from '@/api/account'
import { getAllFeedbackEligibilities, type FeedbackEligibility } from '@/api/feedback'
import { getOrderFeedbackProgress, type OrderFeedbackProgress } from '@/lib/feedbackProgress'
import { groupOrderItemsByStore } from '@/lib/orderStoreOwnership'

function formatPrice(amount?: string | number, currency = 'ZMW') {
  const value = Number(amount || 0)
  const formatted = value.toLocaleString('en-ZM', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return currency === 'ZMW' ? `K${formatted}` : `${currency} ${formatted}`
}

function formatDate(date?: string | null) {
  if (!date) return 'Date unavailable'

  try {
    return new Intl.DateTimeFormat('en-ZM', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date))
  } catch {
    return date
  }
}

function normalizeStatus(status?: string) {
  return String(status || '')
    .toLowerCase()
    .replace(/^wc-/, '')
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
}

function statusStyle(status?: string) {
  const value = normalizeStatus(status)

  if (value === 'processing') return 'border-blue-100 bg-blue-50 text-blue-700'
  if (value === 'shipped') return 'border-violet-100 bg-violet-50 text-violet-700'
  if (['out-for-delivery', 'outfordelivery'].includes(value)) {
    return 'border-orange-100 bg-orange-50 text-orange-700'
  }
  if (['delivered', 'completed'].includes(value)) {
    return 'border-emerald-100 bg-emerald-50 text-emerald-700'
  }
  if (['pending', 'on-hold'].includes(value)) {
    return 'border-amber-100 bg-amber-50 text-amber-700'
  }
  if (['failed', 'cancelled', 'refunded'].includes(value)) {
    return 'border-red-100 bg-red-50 text-red-700'
  }

  return 'border-slate-200 bg-slate-50 text-slate-700'
}

function StatusIcon({ status }: { status?: string }) {
  const value = normalizeStatus(status)

  if (value === 'shipped' || value === 'out-for-delivery' || value === 'outfordelivery') {
    return <Truck className="h-3.5 w-3.5" />
  }
  if (value === 'delivered' || value === 'completed') {
    return <PackageCheck className="h-3.5 w-3.5" />
  }
  if (value === 'pending' || value === 'on-hold') {
    return <Clock3 className="h-3.5 w-3.5" />
  }

  return <Package className="h-3.5 w-3.5" />
}

function OrderCard({
  order,
  feedbackProgress,
  feedbackReady,
}: {
  order: AccountOrder
  feedbackProgress: OrderFeedbackProgress
  feedbackReady: boolean
}) {
  const storeGroups = groupOrderItemsByStore(order.items || [])
  const itemCount = (order.items || []).reduce(
    (total, item) => total + Math.max(1, Number(item.quantity || 1)),
    0
  )

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-dh-primary/25 hover:shadow-md">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5 sm:px-4">
        <div className="min-w-0">
          <p className="text-sm font-black text-dh-primary">
            Order #{order.number || order.id}
          </p>
          <p className="text-[11px] font-medium text-slate-500">
            {formatDate(order.dateCreated)} · {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </p>
        </div>

        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${statusStyle(order.status)}`}>
          <StatusIcon status={order.status} />
          {order.statusLabel || order.status}
        </span>
      </div>

      <div className="divide-y divide-slate-100">
        {storeGroups.slice(0, 2).map((group) => (
          <section key={group.key} className="px-3 py-2.5 sm:px-4">
            <div className="mb-2 flex items-center gap-2">
              <Link
                to={group.sellerUrl}
                className="flex min-w-0 items-center gap-2 text-xs font-black text-dh-primary hover:text-dh-secondary"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-dh-gray text-[9px]">
                  {group.avatarUrl ? (
                    <img src={group.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    group.initials
                  )}
                </span>
                <span className="truncate">{group.storeName}</span>
              </Link>
              <span className="ml-auto shrink-0 text-[10px] font-bold text-slate-400">
                {group.items.length} {group.items.length === 1 ? 'product' : 'products'}
              </span>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.slice(0, 3).map((item) => (
                <Link
                  key={item.id}
                  to={`/product/${item.productId || item.id}`}
                  className="flex min-w-0 items-center gap-2.5 rounded-xl bg-slate-50 p-2 transition hover:bg-dh-primary/5"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <ShoppingBag className="h-4 w-4 text-dh-primary" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-slate-800">{item.name}</span>
                    <span className="mt-0.5 block text-[10px] font-semibold text-slate-500">
                      Qty {item.quantity} · {formatPrice(item.total, order.currency)}
                    </span>
                    {feedbackProgress.reviewedOrderItemIds.has(Number(item.id)) && (
                      <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-black text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> Reviewed
                      </span>
                    )}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-slate-50/80 px-3 py-2.5 sm:px-4">
        <div className="mr-auto min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Order total</p>
          <p className="text-base font-black text-dh-primary">{formatPrice(order.total, order.currency)}</p>
        </div>
        {order.deliveryEstimate?.label && (
          <p className="hidden max-w-xs truncate text-xs font-semibold text-slate-500 sm:block">
            Expected {order.deliveryEstimate.label}
          </p>
        )}
        {['delivered', 'completed'].includes(normalizeStatus(order.status)) && feedbackReady && feedbackProgress.pending > 0 && (
          <Link
            to={`/account/feedback?order=${encodeURIComponent(String(order.id))}`}
            className="inline-flex h-9 items-center justify-center rounded-full border border-dh-primary px-3 text-xs font-bold text-dh-primary hover:bg-dh-primary/5"
          >
            <Star className="mr-1.5 h-3.5 w-3.5" />
            {feedbackProgress.submitted > 0
              ? `${feedbackProgress.pending} review${feedbackProgress.pending === 1 ? '' : 's'} left`
              : 'Leave feedback'}
          </Link>
        )}
        {['delivered', 'completed'].includes(normalizeStatus(order.status)) && feedbackReady && feedbackProgress.pending === 0 && feedbackProgress.submitted > 0 && (
          <span className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Feedback left
          </span>
        )}
        <Link
          to={`/track-order/${order.id}`}
          className="inline-flex h-9 items-center justify-center rounded-full bg-dh-primary px-4 text-xs font-bold text-white hover:bg-dh-secondary"
        >
          View order
          <Eye className="ml-1.5 h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  )
}

const ORDER_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'out-for-delivery', label: 'Out for delivery' },
  { value: 'delivered', label: 'Delivered' },
] as const

type OrderFilter = (typeof ORDER_FILTERS)[number]['value']

const EMPTY_FILTER_COUNTS: Record<OrderFilter, number> = {
  all: 0,
  pending: 0,
  processing: 0,
  shipped: 0,
  'out-for-delivery': 0,
  delivered: 0,
}

export default function OrdersPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading } = useAccount()
  const [orders, setOrders] = useState<AccountOrder[]>([])
  const [isOrdersLoading, setIsOrdersLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderFilter>('all')
  const [filterCounts, setFilterCounts] = useState(EMPTY_FILTER_COUNTS)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalOrders, setTotalOrders] = useState(0)
  const [feedbackEligibilities, setFeedbackEligibilities] = useState<FeedbackEligibility[]>([])
  const [feedbackReady, setFeedbackReady] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate('/login?redirect=/orders')
  }, [isAuthenticated, isLoading, navigate])

  useEffect(() => {
    const nextSearch = searchQuery.trim()
    if (nextSearch === debouncedSearch) return

    const timeout = window.setTimeout(() => {
      setIsOrdersLoading(true)
      setErrorMessage('')
      setOrders([])
      setDebouncedSearch(nextSearch)
      setPage(1)
    }, 280)

    return () => window.clearTimeout(timeout)
  }, [debouncedSearch, searchQuery])

  useEffect(() => {
    if (!isAuthenticated) return
    let mounted = true

    getCustomerOrders({
      page,
      perPage: 10,
      status: statusFilter,
      search: debouncedSearch,
    })
      .then((response) => {
        if (!mounted) return

        setOrders(response.orders || [])
        setPage(response.page || 1)
        setTotalPages(response.totalPages || 1)
        setTotalOrders(response.total ?? response.count ?? 0)

        if (response.counts) {
          setFilterCounts({
            all: response.counts.all || 0,
            pending: response.counts.pending || 0,
            processing: response.counts.processing || 0,
            shipped: response.counts.shippedExact ?? response.counts.shipped ?? 0,
            'out-for-delivery': response.counts.outForDelivery || 0,
            delivered: response.counts.delivered || 0,
          })
        }
      })
      .catch((error) => {
        if (mounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load your orders right now.')
        }
      })
      .finally(() => {
        if (mounted) setIsOrdersLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [debouncedSearch, isAuthenticated, page, statusFilter])

  useEffect(() => {
    if (!isAuthenticated) return
    let active = true

    getAllFeedbackEligibilities()
      .then((eligibilities) => {
        if (active) setFeedbackEligibilities(eligibilities)
      })
      .catch(() => {
        // Orders still remain usable if feedback history is temporarily unavailable.
      })
      .finally(() => {
        if (active) setFeedbackReady(true)
      })

    return () => {
      active = false
    }
  }, [isAuthenticated])

  if (isLoading || (!isAuthenticated && !isLoading)) {
    return (
      <div className="flex min-h-[100svh] flex-col bg-dh-gray">
        <Header />
        <main className="flex min-h-[60vh] items-center justify-center px-4">
          <Loader2 className="h-9 w-9 animate-spin text-dh-primary" />
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-[100svh] flex-col bg-dh-gray">
      <Header />
      <main className="flex-1 py-4 lg:py-7">
        <div className="container mx-auto px-3 sm:px-5 lg:px-8 xl:px-10">
          <nav className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Link to="/account" className="hover:text-dh-primary">My account</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-dh-primary">Orders</span>
            <Link to="/track-order" className="ml-auto inline-flex items-center gap-1 text-dh-primary hover:text-dh-secondary">
              Track another order <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </nav>

          <section className="sticky top-16 z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur sm:top-20 sm:p-4 lg:static">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search order number or product name"
                className="h-10 rounded-full border-slate-200 bg-slate-50 pl-10 text-sm"
              />
            </div>

            <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
              {ORDER_FILTERS.map((filter) => {
                const selected = statusFilter === filter.value
                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => {
                      if (selected) return
                      setIsOrdersLoading(true)
                      setErrorMessage('')
                      setOrders([])
                      setStatusFilter(filter.value)
                      setPage(1)
                    }}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${selected ? 'bg-dh-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-dh-primary/10 hover:text-dh-primary'}`}
                  >
                    {filter.label}
                    <span className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] ${selected ? 'bg-white/20 text-white' : 'bg-white text-slate-600'}`}>
                      {filterCounts[filter.value] || 0}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>

          {errorMessage && (
            <section className="mt-3 flex gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{errorMessage}</p>
            </section>
          )}

          <section className="mt-3">
            {isOrdersLoading && orders.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-dh-primary" />
                <p className="mt-3 text-sm font-bold text-dh-primary">Loading orders…</p>
              </div>
            ) : orders.length > 0 ? (
              <>
                <div className={`grid gap-3 transition-opacity ${isOrdersLoading ? 'opacity-60' : 'opacity-100'}`} aria-busy={isOrdersLoading}>
                  {orders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      feedbackProgress={getOrderFeedbackProgress(feedbackEligibilities, order.id)}
                      feedbackReady={feedbackReady}
                    />
                  ))}
                </div>

                {(totalPages > 1 || isOrdersLoading) && (
                  <div className="mt-3 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setIsOrdersLoading(true)
                        setErrorMessage('')
                        setPage((current) => Math.max(1, current - 1))
                      }}
                      disabled={page <= 1 || isOrdersLoading}
                      className="inline-flex h-9 items-center gap-1 rounded-full border border-slate-200 px-3 text-xs font-bold text-dh-primary disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Previous
                    </button>

                    <p className="text-center text-[11px] font-semibold text-slate-500">
                      Page <strong className="text-dh-primary">{page}</strong> of {totalPages}
                      <span className="hidden sm:inline"> · {totalOrders} matching orders</span>
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        setIsOrdersLoading(true)
                        setErrorMessage('')
                        setPage((current) => Math.min(totalPages, current + 1))
                      }}
                      disabled={page >= totalPages || isOrdersLoading}
                      className="inline-flex h-9 items-center gap-1 rounded-full bg-dh-primary px-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                    >
                      Next
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </>
            ) : filterCounts.all > 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <Search className="mx-auto h-9 w-9 text-dh-primary" />
                <h1 className="mt-3 text-lg font-black text-dh-primary">No matching orders</h1>
                <p className="mt-1 text-sm text-slate-500">Try another order number, product name, or status.</p>
                <Button type="button" onClick={() => { setIsOrdersLoading(true); setErrorMessage(''); setOrders([]); setSearchQuery(''); setStatusFilter('all'); setPage(1) }} className="mt-4 rounded-full bg-dh-primary">
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <ShoppingBag className="mx-auto h-10 w-10 text-dh-primary" />
                <h1 className="mt-3 text-xl font-black text-dh-primary">No orders yet</h1>
                <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">Your purchases will appear here after checkout.</p>
                <Button asChild className="mt-4 rounded-full bg-dh-primary">
                  <Link to="/shop">Start shopping <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
