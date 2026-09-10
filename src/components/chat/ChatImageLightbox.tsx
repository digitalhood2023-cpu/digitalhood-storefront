import { useEffect } from 'react'
import { ZoomIn, ZoomOut, X } from 'lucide-react'

import type { ChatAttachment } from '@/api/chat'
import { usePointZoom } from '@/hooks/usePointZoom'

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

  useEffect(() => {
    if (!attachment) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        reset()
        onClose()
      }
      if (event.key === '+' || event.key === '=') {
        zoomIn()
      }
      if (event.key === '-') {
        zoomOut()
      }
      if (event.key === '0') reset()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [attachment, onClose, reset, zoomIn, zoomOut])

  if (!attachment?.url) return null

  const closeLightbox = () => {
    reset()
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[140] flex touch-none flex-col bg-black/95 text-white"
      role="dialog"
      aria-modal="true"
      aria-label={attachment.fileName || 'Shared photo'}
      onClick={closeLightbox}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <p className="min-w-0 truncate text-sm font-bold">{attachment.fileName || 'Shared photo'}</p>
        <div className="flex shrink-0 items-center gap-2" onClick={(event) => event.stopPropagation()}>
          <button type="button" onClick={zoomOut} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Zoom out">
            <ZoomOut className="h-5 w-5" />
          </button>
          <button type="button" onClick={zoomIn} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Zoom in">
            <ZoomIn className="h-5 w-5" />
          </button>
          <button type="button" onClick={closeLightbox} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black hover:bg-dh-secondary" aria-label="Close photo">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="flex min-h-0 flex-1 touch-none items-center justify-center overflow-hidden p-3 sm:p-6"
        {...viewportProps}
        onClick={(event) => event.stopPropagation()}
      >
        <img
          ref={imageRef}
          src={attachment.url}
          alt={attachment.fileName || 'Shared photo'}
          className="max-h-full max-w-full select-none object-contain"
          style={imageStyle}
          draggable={false}
        />
      </div>
    </div>
  )
}
