type BodyScrollSnapshot = {
  overflow: string
  overscrollBehavior: string
  touchAction: string
}

const activeLocks = new Set<symbol>()

let originalBodyStyles: BodyScrollSnapshot | null = null

function restoreBodyScroll() {
  if (typeof document === 'undefined' || !originalBodyStyles) return

  document.body.style.overflow = originalBodyStyles.overflow
  document.body.style.overscrollBehavior =
    originalBodyStyles.overscrollBehavior
  document.body.style.touchAction = originalBodyStyles.touchAction
  originalBodyStyles = null
}

export function acquireBodyScrollLock() {
  if (typeof document === 'undefined') return () => undefined

  const lockId = Symbol('digitalhood-body-scroll-lock')

  if (activeLocks.size === 0) {
    originalBodyStyles = {
      overflow: document.body.style.overflow,
      overscrollBehavior: document.body.style.overscrollBehavior,
      touchAction: document.body.style.touchAction,
    }
  }

  activeLocks.add(lockId)
  document.body.style.overflow = 'hidden'
  document.body.style.overscrollBehavior = 'none'
  document.body.style.touchAction = 'none'

  let released = false

  return () => {
    if (released) return

    released = true
    activeLocks.delete(lockId)

    if (activeLocks.size === 0) {
      restoreBodyScroll()
    }
  }
}

export function clearBodyScrollLocks() {
  activeLocks.clear()
  restoreBodyScroll()

  if (typeof document === 'undefined') return

  document.body.style.removeProperty('overflow')
  document.body.style.removeProperty('overscroll-behavior')
  document.body.style.removeProperty('touch-action')
  document.documentElement.style.removeProperty('overflow')
  document.documentElement.style.removeProperty('touch-action')
}
