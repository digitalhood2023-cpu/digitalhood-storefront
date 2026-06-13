import { useCallback, useEffect, useRef } from 'react'

type BackButtonDismissOptions = {
  id: string
  isOpen: boolean
  onDismiss: () => void
}

export function useBackButtonDismiss({
  id,
  isOpen,
  onDismiss,
}: BackButtonDismissOptions) {
  const pushedStateRef = useRef(false)
  const closingFromBrowserBackRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (isOpen && !pushedStateRef.current) {
      window.history.pushState(
        {
          ...(window.history.state || {}),
          digitalhoodDismissLayer: id,
        },
        '',
        window.location.href
      )

      pushedStateRef.current = true
      return
    }

    if (!isOpen && closingFromBrowserBackRef.current) {
      closingFromBrowserBackRef.current = false
      pushedStateRef.current = false
    }
  }, [id, isOpen])

  useEffect(() => {
    if (typeof window === 'undefined' || !isOpen) return

    const handlePopState = () => {
      if (!pushedStateRef.current) return

      closingFromBrowserBackRef.current = true
      pushedStateRef.current = false
      onDismiss()
    }

    window.addEventListener('popstate', handlePopState)

    return () => window.removeEventListener('popstate', handlePopState)
  }, [isOpen, onDismiss])

  const dismiss = useCallback(() => {
    onDismiss()

    if (
      typeof window !== 'undefined' &&
      pushedStateRef.current &&
      !closingFromBrowserBackRef.current
    ) {
      pushedStateRef.current = false
      window.history.back()
    }
  }, [onDismiss])

  return dismiss
}
