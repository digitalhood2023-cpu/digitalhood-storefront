import { Link } from 'react-router-dom'
import {
  Archive,
  Bell,
  CheckCheck,
  ChevronRight,
  CircleAlert,
  CreditCard,
  Headphones,
  MessageCircle,
  PackageCheck,
  RefreshCw,
  Settings2,
  ShoppingBag,
  Sparkles,
  Truck,
  UserRound,
} from 'lucide-react'

import type {
  AccountNotification,
  AccountNotificationCategory,
} from '@/api/account'
import { useNotifications } from '@/context/NotificationsContext'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

const categoryPresentation: Record<
  AccountNotificationCategory,
  { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }
> = {
  orders: {
    label: 'Order',
    icon: ShoppingBag,
    tone: 'bg-indigo-50 text-indigo-700',
  },
  payments: {
    label: 'Payment',
    icon: CreditCard,
    tone: 'bg-amber-50 text-amber-800',
  },
  delivery: {
    label: 'Delivery',
    icon: Truck,
    tone: 'bg-emerald-50 text-emerald-700',
  },
  messages: {
    label: 'Message',
    icon: MessageCircle,
    tone: 'bg-violet-50 text-violet-700',
  },
  support: {
    label: 'Support',
    icon: Headphones,
    tone: 'bg-rose-50 text-rose-700',
  },
  account: {
    label: 'Account',
    icon: UserRound,
    tone: 'bg-slate-100 text-slate-700',
  },
  offers: {
    label: 'Offer',
    icon: Sparkles,
    tone: 'bg-orange-50 text-orange-700',
  },
  marketplace: {
    label: 'Marketplace',
    icon: Bell,
    tone: 'bg-blue-50 text-blue-700',
  },
}

function relativeTime(value?: string | null) {
  if (!value) return 'Just now'

  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return 'Recently'

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604_800) return `${Math.floor(seconds / 86_400)}d ago`

  return new Intl.DateTimeFormat('en-ZM', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(timestamp))
}

function NotificationRow({
  notification,
  onOpen,
  onArchive,
}: {
  notification: AccountNotification
  onOpen: () => void
  onArchive: () => void
}) {
  const presentation = categoryPresentation[notification.category]
  const Icon = presentation.icon
  const content = (
    <>
      <div className="relative shrink-0">
        {notification.imageUrl ? (
          <img
            src={notification.imageUrl}
            alt=""
            className="h-11 w-11 rounded-xl border border-slate-100 object-cover"
            loading="lazy"
          />
        ) : (
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${presentation.tone}`}
          >
            <Icon className="h-4 w-4" />
          </span>
        )}

        {!notification.readAt && (
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#ffad32] ring-2 ring-white" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.11em] text-slate-400">
          <span>{presentation.label}</span>
          <span aria-hidden="true">·</span>
          <time>{relativeTime(notification.createdAt)}</time>
          {notification.priority === 'urgent' && (
            <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-rose-700">
              Action
            </span>
          )}
        </div>

        <p className="mt-1 line-clamp-2 text-[13px] font-black leading-4.5 text-[#17155f]">
          {notification.title}
        </p>
        <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">
          {notification.body}
        </p>
      </div>

      {notification.actionUrl && (
        <ChevronRight className="mt-4 h-4 w-4 shrink-0 text-slate-300" />
      )}
    </>
  )

  return (
    <article
      className={`group relative border-b border-slate-100 px-3 py-3 transition ${
        notification.readAt ? 'bg-white' : 'bg-[#fbfbff]'
      }`}
    >
      {notification.actionUrl ? (
        <Link
          to={notification.actionUrl}
          onClick={onOpen}
          className="flex gap-3 rounded-xl pr-7 outline-none focus-visible:ring-2 focus-visible:ring-[#28256d]"
        >
          {content}
        </Link>
      ) : (
        <button
          type="button"
          onClick={onOpen}
          className="flex w-full gap-3 rounded-xl pr-7 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#28256d]"
        >
          {content}
        </button>
      )}

      <button
        type="button"
        onClick={onArchive}
        className="absolute bottom-2.5 right-2.5 rounded-lg p-1.5 text-slate-300 opacity-100 transition hover:bg-slate-100 hover:text-slate-600 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
        aria-label={`Archive ${notification.title}`}
      >
        <Archive className="h-3.5 w-3.5" />
      </button>
    </article>
  )
}

export default function NotificationDrawer() {
  const {
    notifications,
    unreadCount,
    isOpen,
    isLoading,
    error,
    closeNotifications,
    refreshNotifications,
    markRead,
    markAllRead,
    archiveNotification,
  } = useNotifications()

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeNotifications()}>
      <SheetContent className="w-full gap-0 border-l-slate-200 p-0 sm:max-w-[430px]">
        <SheetHeader className="border-b border-slate-100 px-4 py-3 pr-12 text-left">
          <div className="flex items-center justify-between gap-3">
            <div>
              <SheetTitle className="font-display text-lg font-black text-[#17155f]">
                Notifications
              </SheetTitle>
              <SheetDescription className="text-[11px]">
                {unreadCount > 0
                  ? `${unreadCount} update${unreadCount === 1 ? '' : 's'} need your attention`
                  : 'You are caught up'}
              </SheetDescription>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#f0efff] px-2.5 py-1.5 text-[10px] font-black text-[#28256d] hover:bg-[#e4e2ff]"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Read all
              </button>
            )}
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {isLoading && notifications.length === 0 ? (
            <div className="space-y-1 p-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[76px] animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          ) : error && notifications.length === 0 ? (
            <div className="m-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <CircleAlert className="h-5 w-5" />
              <p className="mt-2 text-sm font-black">Updates are reconnecting</p>
              <p className="mt-1 text-xs leading-5">{error}</p>
              <button
                type="button"
                onClick={() => void refreshNotifications()}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black shadow-sm"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          ) : notifications.length > 0 ? (
            notifications.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                onOpen={() => {
                  void markRead(notification.id)
                  if (notification.actionUrl) closeNotifications()
                }}
                onArchive={() => void archiveNotification(notification.id)}
              />
            ))
          ) : (
            <div className="flex min-h-[360px] flex-col items-center justify-center px-8 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0efff] text-[#28256d]">
                <PackageCheck className="h-6 w-6" />
              </span>
              <p className="mt-4 font-display text-lg font-black text-[#17155f]">
                Nothing needs attention
              </p>
              <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
                Order, payment, delivery, support and marketplace updates will appear here.
              </p>
            </div>
          )}
        </div>

        <footer className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-white p-3">
          <Link
            to="/account/notifications"
            onClick={closeNotifications}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[#17155f] px-3 text-xs font-black text-white hover:bg-[#28256d]"
          >
            View all updates
          </Link>
          <Link
            to="/account/notifications?view=settings"
            onClick={closeNotifications}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-black text-[#28256d] hover:bg-slate-50"
          >
            <Settings2 className="h-3.5 w-3.5" />
            Preferences
          </Link>
        </footer>
      </SheetContent>
    </Sheet>
  )
}
