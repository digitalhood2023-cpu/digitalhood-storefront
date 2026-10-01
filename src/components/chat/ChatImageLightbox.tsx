import { useCallback, useEffect, useRef } from 'react'
import { ZoomIn, ZoomOut, X } from 'lucide-react'

import type { ChatAttachment } from '@/api/chat'
import { usePointZoom } from '@/hooks/usePointZoom'

const CHAT_MEDIA_HISTORY_KEY = 'digitalhoodChatMediaOpen'

export default function ChatImageLightbox({
  attachment,
  onClose,
}: {
  attachment: ChatAttachment | null
  onClose: () => void
}) {
  const {
    viewportRef,
    imageRef,
    viewportProps,
    imageStyle,
    reset,
    zoomIn,
    zoomOut,
  } = usePointZoom({
    maxScale: 5,
    resetKey: attachment?.url || '',
  })

  const onCloseRef = useRef(onClose)
  const closeFallbackRef = useRef<number | null>(null)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  const finishClose = useCallback(() => {
    reset()
    onCloseRef.current()
  }, [reset])

  const requestClose = useCallback(() => {
    const state = window.history.state
    const hasMediaHistory =
      Boolean(state && typeof state === 'object' && state[CHAT_MEDIA_HISTORY_KEY]) ||
      window.location.hash.startsWith('#dh-chat-media=')

    if (!hasMediaHistory) {
      finishClose()
      return
    }

    window.history.back()

    if (closeFallbackRef.current !== null) {
      window.clearTimeout(closeFallbackRef.current)
    }

    closeFallbackRef.current = window.setTimeout(() => {
      closeFallbackRef.current = null
      finishClose()
    }, 450)
  }, [finishClose])

  useEffect(() => {
    if (!attachment?.url) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const currentState = window.history.state
    const preservedState =
      currentState && typeof currentState === 'object'
        ? currentState
        : {}

    const historyUrl = new URL(window.location.href)
    historyUrl.hash = `dh-chat-media=${encodeURIComponent(
      attachment.id || attachment.fileName || 'open'
    )}`

    window.history.pushState(
      {
        ...preservedState,
        [CHAT_MEDIA_HISTORY_KEY]: true,
      },
      '',
      historyUrl.toString()
    )

    const handlePopState = () => {
      if (closeFallbackRef.current !== null) {
        window.clearTimeout(closeFallbackRef.current)
        closeFallbackRef.current = null
      }
      finishClose()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        requestClose()
        return
      }
      if (attachment.kind !== 'image') return
      if (event.key === '+' || event.key === '=') {
        zoomIn()
      }
      if (event.key === '-') {
        zoomOut()
      }
      if (event.key === '0') reset()
    }

    window.addEventListener('popstate', handlePopState)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('popstate', handlePopState)
      document.removeEventListener('keydown', handleKeyDown)
      if (closeFallbackRef.current !== null) {
        window.clearTimeout(closeFallbackRef.current)
        closeFallbackRef.current = null
      }
    }
  }, [attachment?.fileName, attachment?.id, attachment?.kind, attachment?.url, finishClose, requestClose, reset, zoomIn, zoomOut])

  if (!attachment?.url) return null

  const isImage = attachment.kind === 'image'
  const mediaLabel =
    attachment.fileName ||
    (isImage ? 'Shared photo' : 'Shared video')

  return (
    <div
      className="fixed inset-0 z-[140] flex touch-none flex-col bg-black/95 text-white"
      role="dialog"
      aria-modal="true"
      aria-label={mediaLabel}
      onClick={requestClose}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <p className="min-w-0 truncate text-sm font-bold">{mediaLabel}</p>
        <div className="flex shrink-0 items-center gap-2" onClick={(event) => event.stopPropagation()}>
          {isImage && (
            <>
              <button type="button" onClick={zoomOut} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Zoom out">
                <ZoomOut className="h-5 w-5" />
              </button>
              <button type="button" onClick={zoomIn} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Zoom in">
                <ZoomIn className="h-5 w-5" />
              </button>
            </>
          )}
          <button type="button" onClick={requestClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black hover:bg-dh-secondary" aria-label={isImage ? 'Close photo' : 'Close video'}>
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {isImage ? (
        <div
          ref={viewportRef}
          className="flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden p-3 sm:p-6"
          {...viewportProps}
          onClick={(event) => event.stopPropagation()}
        >
          <img
            ref={imageRef}
            src={attachment.url}
            alt={mediaLabel}
            className="max-h-full max-w-full select-none object-contain"
            style={imageStyle}
            draggable={false}
          />
        </div>
      ) : (
        <div
          className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3 sm:p-6"
          onClick={(event) => event.stopPropagation()}
        >
          <video
            src={attachment.url}
            controls
            autoPlay
            playsInline
            preload="metadata"
            controlsList="nodownload noremoteplayback nofullscreen"
            disablePictureInPicture
            className="max-h-full max-w-full rounded-xl bg-black object-contain"
            aria-label={mediaLabel}
          />
        </div>
      )}
    </div>
  )
}
