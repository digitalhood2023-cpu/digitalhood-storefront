import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  ChevronRight,
  Clock3,
  Eye,
  Loader2,
  Package,
  PackageCheck,
  Search,
  ShoppingBag,
  Truck,
} from 'lucide-react'

import Header from '@/sections/Header'
import Footer from '@/sections/Footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAccount } from '@/context/AccountContext'
import { getCustomerOrders, type AccountOrder } from '@/api/account'
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

function matchesStatus(order: AccountOrder, filter: string) {
  const status = normalizeStatus(order.status)

  if (filter === 'all') return true
  if (filter === 'pending') return ['pending', 'on-hold'].includes(status)
  if (filter === 'delivered') return ['delivered', 'completed'].includes(status)
  if (filter === 'out-for-delivery') {
    return ['out-for-delivery', 'outfordelivery'].includes(status)
  }

  return status === filter
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

function OrderCard({ order }: { order: AccountOrder }) {
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
]

export default function OrdersPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading } = useAccount()
  const [orders, setOrders] = useState<AccountOrder[]>([])
  const [isOrdersLoading, setIsOrdersLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate('/login?redirect=/orders')
  }, [isAuthenticated, isLoading, navigate])

  useEffect(() => {
    if (!isAuthenticated) return
    let mounted = true

    setIsOrdersLoading(true)
    setErrorMessage('')
    getCustomerOrders()
      .then((response) => {
        if (mounted) setOrders(response.orders || [])
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
  }, [isAuthenticated])

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return orders.filter((order) => {
      const matchesSearch =
        !query ||
        String(order.number || order.id).toLowerCase().includes(query) ||
        String(order.id).toLowerCase().includes(query) ||
        (order.items || []).some((item) => String(item.name || '').toLowerCase().includes(query))

      return matchesStatus(order, statusFilter) && matchesSearch
    })
  }, [orders, searchQuery, statusFilter])

  const filterCounts = useMemo(
    () => Object.fromEntries(ORDER_FILTERS.map((filter) => [filter.value, orders.filter((order) => matchesStatus(order, filter.value)).length])),
    [orders]
  )

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
                    onClick={() => setStatusFilter(filter.value)}
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
            {isOrdersLoading ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-dh-primary" />
                <p className="mt-3 text-sm font-bold text-dh-primary">Loading orders…</p>
              </div>
            ) : filteredOrders.length > 0 ? (
              <div className="grid gap-3">
                {filteredOrders.map((order) => <OrderCard key={order.id} order={order} />)}
              </div>
            ) : orders.length > 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <Search className="mx-auto h-9 w-9 text-dh-primary" />
                <h1 className="mt-3 text-lg font-black text-dh-primary">No matching orders</h1>
                <p className="mt-1 text-sm text-slate-500">Try another order number, product name, or status.</p>
                <Button type="button" onClick={() => { setSearchQuery(''); setStatusFilter('all') }} className="mt-4 rounded-full bg-dh-primary">
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
