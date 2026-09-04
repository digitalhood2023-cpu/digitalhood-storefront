import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const MANAGED_MAIN_ATTRIBUTE = 'data-digitalhood-main'
const MANAGED_TABINDEX_ATTRIBUTE = 'data-digitalhood-managed-tabindex'

export default function AccessibilityFoundation() {
  const location = useLocation()
  const initialRoute = useRef(true)

  useEffect(() => {
    const shouldFocus = !initialRoute.current
    initialRoute.current = false
    let observer: MutationObserver | null = null
    let frameId = 0
    let timeoutId = 0

    const prepareMain = () => {
      const main = document.querySelector<HTMLElement>('main, [role="main"]')
      if (!main) return false

      const previous = document.querySelector<HTMLElement>(`[${MANAGED_MAIN_ATTRIBUTE}]`)
      if (previous && previous !== main) {
        previous.removeAttribute(MANAGED_MAIN_ATTRIBUTE)
        if (previous.getAttribute('id') === 'main-content') previous.removeAttribute('id')
        if (previous.hasAttribute(MANAGED_TABINDEX_ATTRIBUTE)) {
          previous.removeAttribute(MANAGED_TABINDEX_ATTRIBUTE)
          previous.removeAttribute('tabindex')
        }
      }

      const conflictingTarget = document.getElementById('main-content')
      if (conflictingTarget && conflictingTarget !== main) conflictingTarget.removeAttribute('id')
      main.id = 'main-content'
      main.setAttribute(MANAGED_MAIN_ATTRIBUTE, 'true')
      if (!main.hasAttribute('tabindex')) {
        main.tabIndex = -1
        main.setAttribute(MANAGED_TABINDEX_ATTRIBUTE, 'true')
      }
      if (shouldFocus) main.focus({ preventScroll: true })
      observer?.disconnect()
      return true
    }

    frameId = window.requestAnimationFrame(() => {
      if (prepareMain()) return
      observer = new MutationObserver(() => prepareMain())
      observer.observe(document.getElementById('root') || document.body, {
        childList: true,
        subtree: true,
      })
      timeoutId = window.setTimeout(() => observer?.disconnect(), 2000)
    })

    return () => {
      window.cancelAnimationFrame(frameId)
      window.clearTimeout(timeoutId)
      observer?.disconnect()
    }
  }, [location.hash, location.key, location.pathname, location.search])

  return (
    <a className="dh-skip-link" href="#main-content">
      Skip to main content
    </a>
  )
}
