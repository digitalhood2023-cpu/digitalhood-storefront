import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import {
  Archive,
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CreditCard,
  Headphones,
  Loader2,
  MessageCircle,
  PackageCheck,
  RefreshCw,
  Settings2,
  ShoppingBag,
  Sparkles,
  Truck,
  UserRound,
} from 'lucide-react'

import Header from '@/sections/Header'
import Footer from '@/sections/Footer'
import SEO from '@/components/SEO'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useAccount } from '@/context/AccountContext'
import {
  getCustomerNotifications,
  markAllCustomerNotificationsRead,
  updateCustomerNotification,
  updateCustomerNotificationPreferences,
  type AccountNotification,
  type AccountNotificationCategory,
  type AccountNotificationPreferences,
  type AccountNotificationSummary,
} from '@/api/account'

type NotificationFilter = 'all' | 'unread' | AccountNotificationCategory

const filters: Array<{
  key: NotificationFilter
  label: string
  icon: ComponentType<{ className?: string }>
}> = [
  { key: 'all', label: 'All', icon: Bell },
  { key: 'unread', label: 'Unread', icon: CircleAlert },
  { key: 'orders', label: 'Orders', icon: ShoppingBag },
  { key: 'payments', label: 'Payments', icon: CreditCard },
  { key: 'delivery', label: 'Delivery', icon: Truck },
  { key: 'messages', label: 'Messages', icon: MessageCircle },
  { key: 'support', label: 'Support', icon: Headphones },
  { key: 'offers', label: 'Offers', icon: Sparkles },
]

const categoryStyles: Record<
  AccountNotificationCategory,
  { icon: ComponentType<{ className?: string }>; tone: string; label: string }
> = {
  orders: { icon: ShoppingBag, tone: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-200', label: 'Order' },
  payments: { icon: CreditCard, tone: 'bg-amber-50 text-amber-800 dark:bg-amber-950/70 dark:text-amber-200', label: 'Payment' },
  delivery: { icon: Truck, tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-200', label: 'Delivery' },
  messages: { icon: MessageCircle, tone: 'bg-violet-50 text-violet-700 dark:bg-violet-950/70 dark:text-violet-200', label: 'Message' },
  support: { icon: Headphones, tone: 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-200', label: 'Support' },
  account: { icon: UserRound, tone: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200', label: 'Account' },
  offers: { icon: Sparkles, tone: 'bg-orange-50 text-orange-700 dark:bg-orange-950/70 dark:text-orange-200', label: 'Offer' },
  marketplace: { icon: Bell, tone: 'bg-blue-50 text-blue-700 dark:bg-blue-950/70 dark:text-blue-200', label: 'Marketplace' },
}

function formatNotificationDate(value?: string | null) {
  if (!value) return 'Just now'

  const timestamp = new Date(value)
  if (!Number.isFinite(timestamp.getTime())) return 'Recently'

  return new Intl.DateTimeFormat('en-ZM', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp)
}

function getFilterCount(
  filter: NotificationFilter,
  summary: AccountNotificationSummary
) {
  if (filter === 'unread') return summary.unread
  if (filter === 'all') return 0
  return Number(summary[filter as keyof AccountNotificationSummary] || 0)
}

function NotificationItem({
  notification,
  onRead,
  onArchive,
}: {
  notification: AccountNotification
  onRead: () => void
  onArchive: () => void
}) {
  const presentation = categoryStyles[notification.category]
  const Icon = presentation.icon

  return (
    <article
      className={`dh-notification-item group relative flex gap-3 border-b px-3 py-3.5 transition last:border-b-0 sm:px-4 ${
        notification.readAt ? 'dh-notification-item-read' : 'dh-notification-item-unread'
      }`}
    >
      {notification.imageUrl ? (
        <img
          src={notification.imageUrl}
          alt=""
          className="h-12 w-12 shrink-0 rounded-xl border border-slate-100 object-cover"
          loading="lazy"
        />
      ) : (
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${presentation.tone}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="dh-notification-meta flex flex-wrap items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.1em]">
          {!notification.readAt && (
            <span className="h-2 w-2 rounded-full bg-[#ffad32]" aria-label="Unread" />
          )}
          <span>{presentation.label}</span>
          <span aria-hidden="true">·</span>
          <time>{formatNotificationDate(notification.createdAt)}</time>
          {notification.priority === 'urgent' && (
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">
              Action needed
            </span>
          )}
        </div>

        <h2 className="dh-notification-title mt-1 text-sm font-black leading-5">
          {notification.title}
        </h2>
        <p className="dh-notification-body mt-1 text-xs leading-5">
          {notification.body}
        </p>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {notification.actionUrl && (
            <Link
              to={notification.actionUrl}
              onClick={onRead}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-[#17155f] px-3 text-[11px] font-black text-white hover:bg-[#28256d]"
            >
              Open update
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}

          {!notification.readAt && (
            <button
              type="button"
              onClick={onRead}
              className="dh-notification-secondary-action inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[11px] font-black"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark read
            </button>
          )}

          <button
            type="button"
            onClick={onArchive}
            className="dh-notification-subtle inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[11px] font-black hover:bg-slate-100 hover:text-slate-700"
          >
            <Archive className="h-3.5 w-3.5" />
            Archive
          </button>
        </div>
      </div>
    </article>
  )
}

function PreferenceRow({
  title,
  description,
  checked,
  onCheckedChange,
}: {
  title: string
  description: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <span className="min-w-0">
        <span className="dh-notification-title block text-xs font-black">{title}</span>
        <span className="dh-notification-body mt-0.5 block text-[11px] leading-4">
          {description}
        </span>
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  )
}

export default function AccountNotificationsPage() {
  const { isAuthenticated, isLoading: accountLoading } = useAccount()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedFilter = searchParams.get('filter') || 'all'
  const filter = filters.some((item) => item.key === requestedFilter)
    ? (requestedFilter as NotificationFilter)
    : 'all'
  const showSettings = searchParams.get('view') === 'settings'

  const [notifications, setNotifications] = useState<AccountNotification[]>([])
  const [summary, setSummary] = useState<AccountNotificationSummary>({ unread: 0 })
  const [preferences, setPreferences] = useState<AccountNotificationPreferences | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingPreferences, setIsSavingPreferences] = useState(false)
  const [error, setError] = useState('')

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) return

    setIsLoading(true)
    setError('')

    try {
      const response = await getCustomerNotifications({
        page,
        limit: 15,
        filter,
      })
      setNotifications(response.notifications)
      setSummary(response.summary)
      setPreferences(response.preferences)
      setTotalPages(response.pagination.totalPages)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'We could not load your notifications.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [filter, isAuthenticated, page])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) void loadNotifications()
    })

    return () => {
      cancelled = true
    }
  }, [loadNotifications])

  const setFilter = (nextFilter: NotificationFilter) => {
    setPage(1)
    const next = new URLSearchParams(searchParams)
    next.set('filter', nextFilter)
    next.delete('view')
    setSearchParams(next)
  }

  const markRead = async (notification: AccountNotification) => {
    if (notification.readAt) return
    const readAt = new Date().toISOString()
    setNotifications((items) =>
      items.map((item) =>
        item.id === notification.id ? { ...item, readAt } : item
      )
    )
    setSummary((current) => ({
      ...current,
      unread: Math.max(0, current.unread - 1),
    }))

    try {
      await updateCustomerNotification(notification.id, { read: true })
      window.dispatchEvent(new Event('digitalhood:notification-refresh'))
    } catch {
      void loadNotifications()
    }
  }

  const archive = async (notification: AccountNotification) => {
    setNotifications((items) => items.filter((item) => item.id !== notification.id))
    if (!notification.readAt) {
      setSummary((current) => ({
        ...current,
        unread: Math.max(0, current.unread - 1),
      }))
    }

    try {
      await updateCustomerNotification(notification.id, { archived: true })
      window.dispatchEvent(new Event('digitalhood:notification-refresh'))
    } catch {
      void loadNotifications()
    }
  }

  const markAllRead = async () => {
    const readAt = new Date().toISOString()
    setNotifications((items) =>
      items.map((item) => ({ ...item, readAt: item.readAt || readAt }))
    )
    setSummary((current) => ({ ...current, unread: 0 }))

    try {
      await markAllCustomerNotificationsRead()
      window.dispatchEvent(new Event('digitalhood:notification-refresh'))
    } catch {
      void loadNotifications()
    }
  }

  const updatePreference = async (
    key: keyof AccountNotificationPreferences,
    value: boolean
  ) => {
    if (!preferences || isSavingPreferences) return

    const previous = preferences
    const next = { ...preferences, [key]: value }
    setPreferences(next)
    setIsSavingPreferences(true)

    try {
      const response = await updateCustomerNotificationPreferences({
        [key]: value,
      })
      setPreferences(response.preferences)
      window.dispatchEvent(new Event('digitalhood:notification-refresh'))
      void loadNotifications()
    } catch {
      setPreferences(previous)
    } finally {
      setIsSavingPreferences(false)
    }
  }

  const activeFilterLabel = useMemo(
    () => filters.find((item) => item.key === filter)?.label || 'All',
    [filter]
  )

  if (!accountLoading && !isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: '/account/notifications' }} />
  }

  return (
    <div className="dh-notifications-page flex min-h-[100svh] flex-col">
      <SEO
        title="Notifications | DigitalHood Marketplace"
        description="Review your DigitalHood order, payment, delivery, message, support and marketplace updates."
        path="/account/notifications"
        noindex
      />
      <Header />

      <main className="flex-1 py-4 sm:py-6">
        <div className="mx-auto w-full max-w-5xl px-3 sm:px-5 lg:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#a76500]">
                My DigitalHood
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <h1 className="dh-notification-title font-display text-xl font-black sm:text-2xl">
                  Notifications
                </h1>
                {summary.unread > 0 && (
                  <span className="rounded-full bg-[#ffad32] px-2 py-0.5 text-[10px] font-black text-[#17155f]">
                    {summary.unread > 99 ? '99+' : summary.unread}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {summary.unread > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void markAllRead()}
                  className="h-9 rounded-xl px-3 text-xs font-black"
                >
                  <CheckCheck className="mr-1.5 h-4 w-4" />
                  Read all
                </Button>
              )}
              <Button
                type="button"
                variant={showSettings ? 'default' : 'outline'}
                onClick={() => {
                  const next = new URLSearchParams(searchParams)
                  if (showSettings) next.delete('view')
                  else next.set('view', 'settings')
                  setSearchParams(next)
                }}
                className={`h-9 rounded-xl px-3 text-xs font-black ${
                  showSettings ? 'bg-[#17155f]' : ''
                }`}
              >
                <Settings2 className="mr-1.5 h-4 w-4" />
                Preferences
              </Button>
            </div>
          </div>

          {showSettings && preferences && (
            <section className="dh-notification-surface mt-4 rounded-2xl border p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h2 className="dh-notification-title text-sm font-black">Choose useful updates</h2>
                  <p className="dh-notification-body mt-0.5 text-[11px]">
                    Important payment, account-security and active-order updates remain available in your protected feed.
                  </p>
                </div>
                {isSavingPreferences && <Loader2 className="h-4 w-4 animate-spin text-[#28256d]" />}
              </div>

              <div className="grid gap-x-6 sm:grid-cols-2">
                <PreferenceRow
                  title="Order progress"
                  description="Order processing and seller preparation."
                  checked={preferences.orderUpdates}
                  onCheckedChange={(value) => void updatePreference('orderUpdates', value)}
                />
                <PreferenceRow
                  title="Delivery movement"
                  description="Shipped, arriving today and delivered."
                  checked={preferences.deliveryUpdates}
                  onCheckedChange={(value) => void updatePreference('deliveryUpdates', value)}
                />
                <PreferenceRow
                  title="Marketplace messages"
                  description="Replies from stores and DigitalHood Support."
                  checked={preferences.messageUpdates}
                  onCheckedChange={(value) => void updatePreference('messageUpdates', value)}
                />
                <PreferenceRow
                  title="Offers for you"
                  description="Relevant deals and price opportunities."
                  checked={preferences.offers}
                  onCheckedChange={(value) => void updatePreference('offers', value)}
                />
                <PreferenceRow
                  title="Marketplace news"
                  description="New features, services and important changes."
                  checked={preferences.marketplaceNews}
                  onCheckedChange={(value) => void updatePreference('marketplaceNews', value)}
                />
              </div>
            </section>
          )}

          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {filters.map((item) => {
              const Icon = item.icon
              const count = getFilterCount(item.key, summary)
              const active = item.key === filter

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-[11px] font-black transition ${
                    active
                      ? 'border-[#17155f] bg-[#17155f] text-white'
                      : 'dh-notification-filter'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                  {count > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                        active ? 'bg-white/15 text-white' : 'bg-[#ffead0] text-[#8a5200]'
                      }`}
                    >
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          <section className="dh-notification-surface mt-3 overflow-hidden rounded-2xl border shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5 sm:px-4">
              <p className="dh-notification-title text-xs font-black">{activeFilterLabel} updates</p>
              <button
                type="button"
                onClick={() => void loadNotifications()}
                disabled={isLoading}
                className="dh-notification-body inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-black hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {isLoading ? (
              <div className="space-y-px bg-slate-100">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="h-28 animate-pulse bg-white p-4">
                    <div className="h-full rounded-xl bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <CircleAlert className="mx-auto h-7 w-7 text-amber-600" />
                <p className="dh-notification-title mt-3 text-sm font-black">Updates are reconnecting</p>
                <p className="dh-notification-body mx-auto mt-1 max-w-md text-xs leading-5">{error}</p>
                <Button onClick={() => void loadNotifications()} className="mt-4 rounded-xl bg-[#17155f] text-xs font-black">
                  Try again
                </Button>
              </div>
            ) : notifications.length > 0 ? (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={() => void markRead(notification)}
                  onArchive={() => void archive(notification)}
                />
              ))
            ) : (
              <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
                <PackageCheck className="h-8 w-8 text-[#28256d]" />
                <p className="dh-notification-title mt-3 font-display text-lg font-black">Nothing here right now</p>
                <p className="dh-notification-body mt-1 max-w-sm text-xs leading-5">
                  You are caught up in this category. New marketplace activity will appear automatically.
                </p>
              </div>
            )}
          </section>

          {totalPages > 1 && (
            <div className="dh-notification-surface mt-3 flex items-center justify-between rounded-xl border p-2">
              <Button
                type="button"
                variant="ghost"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="h-8 rounded-lg px-2 text-xs font-black"
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Previous
              </Button>
              <span className="text-[11px] font-black text-slate-500">Page {page} of {totalPages}</span>
              <Button
                type="button"
                variant="ghost"
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                className="h-8 rounded-lg px-2 text-xs font-black"
              >
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}

          <Link
            to="/account"
            className="mt-4 inline-flex items-center gap-1 text-xs font-black text-[#28256d] hover:underline"
          >
            <ChevronLeft className="h-4 w-4" /> Back to account
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  )
}
