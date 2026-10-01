import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  Check,
  Crop,
  Loader2,
  Pencil,
  RotateCcw,
  SmilePlus,
  X,
} from 'lucide-react'

import {
  cropChatVideoFile,
  exportChatImageCanvas,
  getChatCropRatio,
  isChatImageFile,
  type ChatCropAspect,
} from '@/lib/chatMediaPreparation'

const ASPECTS: Array<{ value: ChatCropAspect; label: string }> = [
  { value: 'original', label: 'Original' },
  { value: 'square', label: 'Square' },
  { value: 'portrait', label: '4:5' },
  { value: 'landscape', label: '16:9' },
]

const DRAWING_COLORS = ['#ef4444', '#fbbf24', '#ffffff', '#312e81']
const EMOJIS = ['❤️', '😂', '🔥', '✨', '👍', '📍']

function getCenteredCrop(width: number, height: number, aspect: ChatCropAspect) {
  const ratio = getChatCropRatio(aspect)
  if (!ratio) return { x: 0, y: 0, width, height }

  const sourceRatio = width / height
  if (sourceRatio > ratio) {
    const cropWidth = height * ratio
    return { x: (width - cropWidth) / 2, y: 0, width: cropWidth, height }
  }

  const cropHeight = width / ratio
  return { x: 0, y: (height - cropHeight) / 2, width, height: cropHeight }
}

export default function ChatMediaEditor({
  file,
  previewUrl,
  onCancel,
  onApply,
}: {
  file: File
  previewUrl: string
  onCancel: () => void
  onApply: (file: File) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const sourceImageRef = useRef<HTMLImageElement | null>(null)
  const drawingRef = useRef(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)
  const [aspect, setAspect] = useState<ChatCropAspect>('original')
  const [isMarking, setIsMarking] = useState(false)
  const [drawingColor, setDrawingColor] = useState(DRAWING_COLORS[0])
  const [isSaving, setIsSaving] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const isImage = isChatImageFile(file)

  const renderImage = useCallback((nextAspect: ChatCropAspect) => {
    const image = sourceImageRef.current
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!image || !canvas || !context) return

    const crop = getCenteredCrop(image.naturalWidth, image.naturalHeight, nextAspect)
    const scale = Math.min(1, 1400 / Math.max(crop.width, crop.height))
    canvas.width = Math.max(1, Math.round(crop.width * scale))
    canvas.height = Math.max(1, Math.round(crop.height * scale))
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(
      image,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      canvas.width,
      canvas.height
    )
  }, [])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    if (!isImage) return
    const image = new Image()
    image.onload = () => {
      sourceImageRef.current = image
      renderImage(aspect)
    }
    image.onerror = () => setError('Unable to open this image for editing.')
    image.src = previewUrl
    return () => {
      sourceImageRef.current = null
      image.removeAttribute('src')
    }
  }, [aspect, isImage, previewUrl, renderImage])

  function selectAspect(nextAspect: ChatCropAspect) {
    setAspect(nextAspect)
    setError('')
    if (isImage) renderImage(nextAspect)
  }

  function canvasPoint(event: ReactPointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  function startDrawing(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!isMarking) return
    drawingRef.current = true
    lastPointRef.current = canvasPoint(event)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function draw(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!isMarking || !drawingRef.current || !lastPointRef.current) return
    const context = event.currentTarget.getContext('2d')
    if (!context) return
    const point = canvasPoint(event)
    context.strokeStyle = drawingColor
    context.lineWidth = Math.max(4, event.currentTarget.width / 140)
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.beginPath()
    context.moveTo(lastPointRef.current.x, lastPointRef.current.y)
    context.lineTo(point.x, point.y)
    context.stroke()
    lastPointRef.current = point
  }

  function stopDrawing() {
    drawingRef.current = false
    lastPointRef.current = null
  }

  function addEmoji(emoji: string) {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const offset = ((EMOJIS.indexOf(emoji) % 3) - 1) * canvas.width * 0.16
    context.save()
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.font = `${Math.max(44, Math.round(canvas.width / 7))}px system-ui, sans-serif`
    context.fillText(emoji, canvas.width / 2 + offset, canvas.height / 2)
    context.restore()
  }

  async function applyEdits() {
    setError('')
    setIsSaving(true)
    setProgress(0)

    try {
      if (isImage) {
        const canvas = canvasRef.current
        if (!canvas) throw new Error('The photo editor is not ready yet.')
        onApply(await exportChatImageCanvas(canvas, file.name))
      } else {
        onApply(await cropChatVideoFile(file, aspect, setProgress))
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to apply these edits.')
      setIsSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-3"
      style={{ zIndex: 90, backgroundColor: 'rgba(2, 6, 23, 0.9)' }}
      role="dialog"
      aria-modal="true"
      aria-label={isImage ? 'Edit photo' : 'Crop video'}
    >
      <div className="flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl" style={{ maxHeight: '94svh' }}>
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <p className="font-display text-base font-black text-dh-primary">
              {isImage ? 'Edit photo' : 'Crop video'}
            </p>
            <p className="text-xs font-semibold text-slate-500">
              {isImage ? 'Crop, draw and add an emoji before sending.' : 'Choose a crop. Video export plays through once.'}
            </p>
          </div>
          <button type="button" onClick={onCancel} disabled={isSaving} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 disabled:opacity-50" aria-label="Close media editor">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4" style={{ backgroundColor: '#020617' }}>
          <div className="mx-auto flex max-w-3xl items-center justify-center" style={{ minHeight: 260 }}>
            {isImage ? (
              <canvas
                ref={canvasRef}
                onPointerDown={startDrawing}
                onPointerMove={draw}
                onPointerUp={stopDrawing}
                onPointerCancel={stopDrawing}
                className={`max-w-full rounded-xl object-contain shadow-lg ${isMarking ? 'touch-none' : ''}`}
                style={{ maxHeight: '62svh', cursor: isMarking ? 'crosshair' : undefined }}
                aria-label="Photo editing canvas"
              />
            ) : (
              <video
                src={previewUrl}
                controls
                playsInline
                preload="metadata"
                className="max-w-full rounded-xl bg-black object-cover"
                style={{
                  maxHeight: '62svh',
                  aspectRatio: aspect === 'square' ? '1' : aspect === 'portrait' ? '4 / 5' : aspect === 'landscape' ? '16 / 9' : undefined,
                }}
              />
            )}
          </div>
        </div>

        <div className="space-y-3 border-t border-slate-200 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-xs font-black text-slate-600"><Crop className="h-4 w-4" /> Crop</span>
            {ASPECTS.map(option => (
              <button key={option.value} type="button" onClick={() => selectAspect(option.value)} disabled={isSaving} className={`rounded-full px-3 py-1.5 text-xs font-black transition ${aspect === option.value ? 'bg-dh-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {option.label}
              </button>
            ))}
          </div>

          {isImage && (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setIsMarking(current => !current)} className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-black ${isMarking ? 'bg-dh-secondary text-dh-primary' : 'bg-slate-100 text-slate-600'}`}>
                <Pencil className="h-4 w-4" /> Mark
              </button>
              {DRAWING_COLORS.map(color => (
                <button key={color} type="button" onClick={() => { setDrawingColor(color); setIsMarking(true) }} className={`h-7 w-7 rounded-full border-2 ${drawingColor === color ? 'border-dh-secondary' : 'border-slate-300'}`} style={{ backgroundColor: color }} aria-label={`Draw with ${color}`} />
              ))}
              <span className="ml-1 inline-flex items-center gap-1 text-xs font-black text-slate-600"><SmilePlus className="h-4 w-4" /> Emoji</span>
              {EMOJIS.map(emoji => (
                <button key={emoji} type="button" onClick={() => addEmoji(emoji)} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-lg hover:bg-slate-200" aria-label={`Add ${emoji}`}>{emoji}</button>
              ))}
              <button type="button" onClick={() => renderImage(aspect)} className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-black text-slate-500 hover:bg-slate-100">
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
            </div>
          )}

          {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</p>}
          {isSaving && !isImage && (
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-dh-secondary transition-[width]" style={{ width: `${progress}%` }} /></div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onCancel} disabled={isSaving} className="rounded-full px-4 py-2 text-sm font-black text-slate-500 hover:bg-slate-100 disabled:opacity-50">Cancel</button>
            <button type="button" onClick={() => void applyEdits()} disabled={isSaving} className="inline-flex items-center gap-2 rounded-full bg-dh-primary px-4 py-2 text-sm font-black text-white hover:bg-dh-secondary hover:text-dh-primary disabled:opacity-60">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {isSaving ? (isImage ? 'Saving…' : `Cropping ${progress}%`) : 'Apply edits'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
