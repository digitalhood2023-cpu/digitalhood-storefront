import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react'

type ZoomTransform = {
  scale: number
  x: number
  y: number
}

type PointerPosition = {
  x: number
  y: number
}

type Gesture =
  | {
      mode: 'single'
      pointerId: number
      pointerType: string
      start: PointerPosition
      last: PointerPosition
      startTransform: ZoomTransform
      moved: boolean
      startedAt: number
    }
  | {
      mode: 'pinch'
      distance: number
      worldX: number
      worldY: number
      startScale: number
    }
  | null

type UsePointZoomOptions = {
  maxScale?: number
  minScale?: number
  resetKey?: string | number | boolean
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
}

const DEFAULT_TRANSFORM: ZoomTransform = { scale: 1, x: 0, y: 0 }

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function distanceBetween(first: PointerPosition, second: PointerPosition) {
  return Math.hypot(first.x - second.x, first.y - second.y)
}

function midpoint(first: PointerPosition, second: PointerPosition) {
  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
  }
}

/**
 * Keeps the exact image point under a pinch midpoint, mouse wheel pointer, or
 * double tap. Panning is bounded against the rendered image and viewport.
 */
export function usePointZoom({
  maxScale = 5,
  minScale = 1,
  resetKey,
  onSwipeLeft,
  onSwipeRight,
}: UsePointZoomOptions = {}) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const pointersRef = useRef(new Map<number, PointerPosition>())
  const gestureRef = useRef<Gesture>(null)
  const transformRef = useRef<ZoomTransform>(DEFAULT_TRANSFORM)
  const lastTouchTapRef = useRef<{ at: number; x: number; y: number } | null>(null)
  const [transform, setTransform] = useState<ZoomTransform>(DEFAULT_TRANSFORM)

  const getBoundedTransform = useCallback((next: ZoomTransform) => {
    const scale = clamp(Number.isFinite(next.scale) ? next.scale : minScale, minScale, maxScale)
    const viewport = viewportRef.current
    const image = imageRef.current

    if (!viewport || !image || scale <= minScale + 0.001) {
      return { scale: minScale, x: 0, y: 0 }
    }

    const maxX = Math.max(0, (image.offsetWidth * scale - viewport.clientWidth) / 2)
    const maxY = Math.max(0, (image.offsetHeight * scale - viewport.clientHeight) / 2)

    return {
      scale,
      x: clamp(next.x, -maxX, maxX),
      y: clamp(next.y, -maxY, maxY),
    }
  }, [maxScale, minScale])

  const commit = useCallback((next: ZoomTransform) => {
    const bounded = getBoundedTransform(next)
    transformRef.current = bounded
    setTransform(bounded)
    return bounded
  }, [getBoundedTransform])

  const reset = useCallback(() => {
    pointersRef.current.clear()
    gestureRef.current = null
    transformRef.current = { scale: minScale, x: 0, y: 0 }
    setTransform({ scale: minScale, x: 0, y: 0 })
  }, [minScale])

  const zoomAt = useCallback((clientX: number, clientY: number, requestedScale: number) => {
    const viewport = viewportRef.current
    if (!viewport) return

    const current = transformRef.current
    const nextScale = clamp(requestedScale, minScale, maxScale)
    const bounds = viewport.getBoundingClientRect()
    const focalX = clientX - bounds.left - bounds.width / 2
    const focalY = clientY - bounds.top - bounds.height / 2
    const worldX = (focalX - current.x) / current.scale
    const worldY = (focalY - current.y) / current.scale

    commit({
      scale: nextScale,
      x: focalX - worldX * nextScale,
      y: focalY - worldY * nextScale,
    })
  }, [commit, maxScale, minScale])

  const zoomBy = useCallback((amount: number) => {
    const viewport = viewportRef.current
    if (!viewport) return
    const bounds = viewport.getBoundingClientRect()
    zoomAt(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2, transformRef.current.scale + amount)
  }, [zoomAt])

  const zoomIn = useCallback(() => zoomBy(0.5), [zoomBy])
  const zoomOut = useCallback(() => zoomBy(-0.5), [zoomBy])

  const startPinch = useCallback(() => {
    const positions = Array.from(pointersRef.current.values())
    const viewport = viewportRef.current
    if (positions.length < 2 || !viewport) return

    const focus = midpoint(positions[0], positions[1])
    const bounds = viewport.getBoundingClientRect()
    const focalX = focus.x - bounds.left - bounds.width / 2
    const focalY = focus.y - bounds.top - bounds.height / 2
    const current = transformRef.current

    gestureRef.current = {
      mode: 'pinch',
      distance: Math.max(1, distanceBetween(positions[0], positions[1])),
      worldX: (focalX - current.x) / current.scale,
      worldY: (focalY - current.y) / current.scale,
      startScale: current.scale,
    }
  }, [])

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if ((event.target as HTMLElement).closest('button, a, input, select, textarea')) return
    event.currentTarget.setPointerCapture?.(event.pointerId)
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

    if (pointersRef.current.size >= 2) {
      startPinch()
      return
    }

    gestureRef.current = {
      mode: 'single',
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      start: { x: event.clientX, y: event.clientY },
      last: { x: event.clientX, y: event.clientY },
      startTransform: transformRef.current,
      moved: false,
      startedAt: Date.now(),
    }
  }, [startPinch])

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const gesture = gestureRef.current

    if (pointersRef.current.size >= 2) {
      if (!gesture || gesture.mode !== 'pinch') startPinch()
      const pinch = gestureRef.current
      const viewport = viewportRef.current
      const positions = Array.from(pointersRef.current.values())
      if (!pinch || pinch.mode !== 'pinch' || !viewport || positions.length < 2) return

      event.preventDefault()
      const focus = midpoint(positions[0], positions[1])
      const bounds = viewport.getBoundingClientRect()
      const focalX = focus.x - bounds.left - bounds.width / 2
      const focalY = focus.y - bounds.top - bounds.height / 2
      const scale = clamp(
        pinch.startScale * (distanceBetween(positions[0], positions[1]) / pinch.distance),
        minScale,
        maxScale
      )

      commit({
        scale,
        x: focalX - pinch.worldX * scale,
        y: focalY - pinch.worldY * scale,
      })
      return
    }

    if (!gesture || gesture.mode !== 'single' || gesture.pointerId !== event.pointerId) return
    gesture.last = { x: event.clientX, y: event.clientY }
    gesture.moved = gesture.moved || distanceBetween(gesture.start, gesture.last) > 6

    if (transformRef.current.scale > minScale + 0.001) {
      event.preventDefault()
      commit({
        scale: gesture.startTransform.scale,
        x: gesture.startTransform.x + event.clientX - gesture.start.x,
        y: gesture.startTransform.y + event.clientY - gesture.start.y,
      })
    }
  }, [commit, maxScale, minScale, startPinch])

  const finishPointer = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const finishedGesture = gestureRef.current
    const finishedPoint = pointersRef.current.get(event.pointerId) || { x: event.clientX, y: event.clientY }
    pointersRef.current.delete(event.pointerId)

    if (pointersRef.current.size >= 2) {
      startPinch()
      return
    }

    if (pointersRef.current.size === 1) {
      const [pointerId, point] = Array.from(pointersRef.current.entries())[0]
      gestureRef.current = {
        mode: 'single',
        pointerId,
        pointerType: event.pointerType,
        start: point,
        last: point,
        startTransform: transformRef.current,
        moved: false,
        startedAt: Date.now(),
      }
      return
    }

    gestureRef.current = null
    if (!finishedGesture || finishedGesture.mode !== 'single' || finishedGesture.pointerId !== event.pointerId) return

    const deltaX = finishedGesture.start.x - finishedPoint.x
    const deltaY = finishedGesture.start.y - finishedPoint.y
    const isTap = !finishedGesture.moved && Date.now() - finishedGesture.startedAt < 350

    if (transformRef.current.scale <= minScale + 0.001 && Math.abs(deltaX) > 62 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
      if (deltaX > 0) onSwipeLeft?.()
      else onSwipeRight?.()
      return
    }

    if (finishedGesture.pointerType === 'touch' && isTap) {
      const previousTap = lastTouchTapRef.current
      const now = Date.now()
      if (previousTap && now - previousTap.at < 320 && distanceBetween(previousTap, finishedPoint) < 28) {
        event.preventDefault()
        const nextScale = transformRef.current.scale > minScale + 0.05 ? minScale : Math.min(maxScale, 2.5)
        zoomAt(finishedPoint.x, finishedPoint.y, nextScale)
        lastTouchTapRef.current = null
      } else {
        lastTouchTapRef.current = { at: now, ...finishedPoint }
      }
    }
  }, [maxScale, minScale, onSwipeLeft, onSwipeRight, startPinch, zoomAt])

  const onWheel = useCallback((event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const factor = Math.exp(-event.deltaY * 0.002)
    zoomAt(event.clientX, event.clientY, transformRef.current.scale * factor)
  }, [zoomAt])

  const onDoubleClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    const nextScale = transformRef.current.scale > minScale + 0.05 ? minScale : Math.min(maxScale, 2.5)
    zoomAt(event.clientX, event.clientY, nextScale)
  }, [maxScale, minScale, zoomAt])

  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (active) reset()
    })
    return () => {
      active = false
    }
  }, [reset, resetKey])

  useEffect(() => {
    const handleResize = () => commit(transformRef.current)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [commit])

  return {
    viewportRef,
    imageRef,
    scale: transform.scale,
    reset,
    zoomIn,
    zoomOut,
    viewportProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: finishPointer,
      onPointerCancel: finishPointer,
      onWheel,
      onDoubleClick,
    },
    imageStyle: {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
      transformOrigin: 'center center',
      willChange: 'transform',
    },
  }
}
