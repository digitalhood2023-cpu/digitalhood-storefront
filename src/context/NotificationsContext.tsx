import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import {
  getCustomerNotifications,
  getCustomerNotificationSummary,
  markAllCustomerNotificationsRead,
  updateCustomerNotification,
  type AccountNotification,
} from '@/api/account'
import { useAccount } from '@/context/AccountContext'
import {
  flushOfflineActions,
  queueOfflineAction,
} from '@/lib/networkResilience'

type NotificationsContextValue = {
  notifications: AccountNotification[]
  unreadCount: number
  isOpen: boolean
  isLoading: boolean
  error: string
  openNotifications: () => void
  closeNotifications: () => void
  refreshNotifications: () => Promise<void>
  markRead: (notificationId: string) => Promise<void>
  markAllRead: () => Promise<void>
  archiveNotification: (notificationId: string) => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null
)

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { isAuthenticated } = useAccount()
  const [notifications, setNotifications] = useState<AccountNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const refreshSummary = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      const response = await getCustomerNotificationSummary()
      setUnreadCount(Math.max(0, Number(response.summary?.unread || 0)))
    } catch {
      // Keep the last trusted count during short network interruptions.
    }
  }, [isAuthenticated])

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) return

    setIsLoading(true)
    setError('')

    try {
      const response = await getCustomerNotifications({
        limit: 12,
        filter: 'unread',
      })
      setNotifications(response.notifications)
      setUnreadCount(Math.max(0, Number(response.summary?.unread || 0)))
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Notifications are taking longer than expected.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  const openNotifications = useCallback(() => {
    setIsOpen(true)
  }, [])

  const closeNotifications = useCallback(() => {
    setIsOpen(false)
  }, [])

  const markRead = useCallback(
    async (notificationId: string) => {
      const current = notifications.find((item) => item.id === notificationId)
      if (!current || current.readAt) return

      setNotifications((items) =>
        items.filter((item) => item.id !== notificationId)
      )
      setUnreadCount((count) => Math.max(0, count - 1))

      try {
        await updateCustomerNotification(notificationId, { read: true })
      } catch {
        if (!navigator.onLine) {
          try {
            await queueOfflineAction({ type: 'notification_read', entityId: notificationId })
            return
          } catch {
            // IndexedDB can be unavailable in private browsing; restore the server state below.
          }
        }
        setNotifications(notifications)
        setUnreadCount((count) => count + 1)
      }
    },
    [notifications]
  )

  const markAllRead = useCallback(async () => {
    const previous = notifications
    const previousCount = unreadCount
    setNotifications([])
    setUnreadCount(0)

    try {
      await markAllCustomerNotificationsRead()
    } catch {
      if (!navigator.onLine) {
        try {
          await queueOfflineAction({ type: 'notification_mark_all_read' })
          return
        } catch {
          // IndexedDB can be unavailable in private browsing; restore the server state below.
        }
      }
      setNotifications(previous)
      setUnreadCount(previousCount)
    }
  }, [notifications, unreadCount])

  const archiveNotification = useCallback(
    async (notificationId: string) => {
      const previous = notifications
      const target = notifications.find((item) => item.id === notificationId)

      setNotifications((items) =>
        items.filter((item) => item.id !== notificationId)
      )
      if (target && !target.readAt) {
        setUnreadCount((count) => Math.max(0, count - 1))
      }

      try {
        await updateCustomerNotification(notificationId, { archived: true })
      } catch {
        if (!navigator.onLine) {
          try {
            await queueOfflineAction({ type: 'notification_archive', entityId: notificationId })
            return
          } catch {
            // IndexedDB can be unavailable in private browsing; restore the server state below.
          }
        }
        setNotifications(previous)
        if (target && !target.readAt) {
          setUnreadCount((count) => count + 1)
        }
      }
    },
    [notifications]
  )

  useEffect(() => {
    if (!isAuthenticated) {
      let cancelled = false
      queueMicrotask(() => {
        if (cancelled) return
        setNotifications([])
        setUnreadCount(0)
        setIsOpen(false)
        setError('')
      })
      return () => {
        cancelled = true
      }
    }

    queueMicrotask(() => void refreshSummary())

    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshSummary()
    }, 45_000)

    const handleRefresh = () => {
      void refreshSummary()
      if (isOpen) void refreshNotifications()
    }

    const handleFocus = () => void refreshSummary()

    window.addEventListener('focus', handleFocus)
    window.addEventListener(
      'digitalhood:notification-refresh',
      handleRefresh
    )

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener(
        'digitalhood:notification-refresh',
        handleRefresh
      )
    }
  }, [isAuthenticated, isOpen, refreshNotifications, refreshSummary])

  useEffect(() => {
    if (!isOpen || !isAuthenticated) return

    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) void refreshNotifications()
    })

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, isOpen, refreshNotifications])

  useEffect(() => {
    if (!isAuthenticated) return

    const flush = () => {
      void flushOfflineActions(async (action) => {
        if (action.type === 'notification_mark_all_read') {
          await markAllCustomerNotificationsRead()
          return
        }
        if (!action.entityId) throw new Error('Notification id is missing.')
        await updateCustomerNotification(
          action.entityId,
          action.type === 'notification_archive' ? { archived: true } : { read: true }
        )
      }).then(() => void refreshSummary())
    }

    window.addEventListener('online', flush)
    if (navigator.onLine) flush()
    return () => window.removeEventListener('online', flush)
  }, [isAuthenticated, refreshSummary])

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notifications,
      unreadCount,
      isOpen,
      isLoading,
      error,
      openNotifications,
      closeNotifications,
      refreshNotifications,
      markRead,
      markAllRead,
      archiveNotification,
    }),
    [
      archiveNotification,
      closeNotifications,
      error,
      isLoading,
      isOpen,
      markAllRead,
      markRead,
      notifications,
      openNotifications,
      refreshNotifications,
      unreadCount,
    ]
  )

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}

// The provider and its colocated hook intentionally share this small module.
// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications() {
  const context = useContext(NotificationsContext)

  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider')
  }

  return context
}
