import { useEffect, useRef, useState } from 'react'
import { ZoomIn, ZoomOut, X } from 'lucide-react'

import type { ChatAttachment } from '@/api/chat'

export default function ChatImageLightbox({
  attachment,
  onClose,
}: {
  attachment: ChatAttachment | null
  onClose: () => void
}) {
  const [scale, setScale] = useState(1)
  const pinchDistanceRef = useRef<number | null>(null)

  useEffect(() => {
    if (!attachment) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setScale(1)
        onClose()
      }
      if (event.key === '+' || event.key === '=') {
        setScale((current) => Math.min(4, current + 0.5))
      }
      if (event.key === '-') {
        setScale((current) => Math.max(1, current - 0.5))
      }
      if (event.key === '0') setScale(1)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [attachment, onClose])

  if (!attachment?.url) return null

  const closeLightbox = () => {
    setScale(1)
    onClose()
  }

  const touchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return null
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    )
  }

  return (
    <div
      className="fixed inset-0 z-[140] flex touch-none flex-col bg-black/95 text-white"
      role="dialog"
      aria-modal="true"
      aria-label={attachment.fileName || 'Shared photo'}
      onClick={closeLightbox}
      onTouchStart={(event) => {
        pinchDistanceRef.current = touchDistance(event.touches)
      }}
      onTouchMove={(event) => {
        const distance = touchDistance(event.touches)
        if (!distance || !pinchDistanceRef.current) return
        event.preventDefault()
        const delta = distance - pinchDistanceRef.current
        if (Math.abs(delta) > 5) {
          setScale((current) => Math.min(4, Math.max(1, current + delta / 180)))
          pinchDistanceRef.current = distance
        }
      }}
      onTouchEnd={() => {
        pinchDistanceRef.current = null
      }}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <p className="min-w-0 truncate text-sm font-bold">{attachment.fileName || 'Shared photo'}</p>
        <div className="flex shrink-0 items-center gap-2" onClick={(event) => event.stopPropagation()}>
          <button type="button" onClick={() => setScale((current) => Math.max(1, current - 0.5))} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Zoom out">
            <ZoomOut className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => setScale((current) => Math.min(4, current + 0.5))} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Zoom in">
            <ZoomIn className="h-5 w-5" />
          </button>
          <button type="button" onClick={closeLightbox} className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black hover:bg-dh-secondary" aria-label="Close photo">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3 sm:p-6">
        <img
          src={attachment.url}
          alt={attachment.fileName || 'Shared photo'}
          className="max-h-full max-w-full select-none object-contain transition-transform duration-150"
          style={{ transform: `scale(${scale})` }}
          draggable={false}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={() => setScale((current) => current > 1 ? 1 : 2)}
        />
      </div>
    </div>
  )
}
