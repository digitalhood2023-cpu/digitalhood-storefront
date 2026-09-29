import { Component, useEffect, useLayoutEffect, useState } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

declare global {
  interface Window {
    __digitalhoodBootReady?: () => void
  }
}

/** Runs after a React commit, never after every image/third-party script loads. */
export function StartupReady() {
  useLayoutEffect(() => {
    const root = document.getElementById('root')
    if (!root) return
    const reveal = () => {
      window.__digitalhoodBootReady?.()
      const startup = document.getElementById('dh-startup')
      if (startup?.parentNode) startup.parentNode.removeChild(startup)
    }
    // A provider returning null must not reveal an empty page.
    if (root.childElementCount > 0) { reveal(); return }
    const observer = new MutationObserver(() => {
      if (root.childElementCount > 0) { reveal(); observer.disconnect() }
    })
    observer.observe(root, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])
  return null
}

function RecoveryLinks() {
  return (
    <div style={{ marginTop: 20, lineHeight: 2 }}>
      <a href="/lite" style={{ color: '#15125f', fontWeight: 700 }}>
        Browse the low-data catalogue
      </a>
      <form action="/lite" method="get" style={{ marginTop: 12 }}>
        <label htmlFor="recovery-search">Search products</label>{' '}
        <input id="recovery-search" name="q" type="search" maxLength={100}
          style={{ border: '1px solid #777', padding: 8, maxWidth: '100%', color: '#111', background: '#fff' }} />{' '}
        <button type="submit" style={{ border: '1px solid #15125f', padding: '8px 14px', color: '#fff', background: '#15125f' }}>Search</button>
      </form>
      <p style={{ fontSize: 14 }}>The catalogue works without the full app. Secure checkout stays in the full marketplace.</p>
    </div>
  )
}

export function RouteLoading() {
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 8000)
    return () => window.clearTimeout(timer)
  }, [])
  return (
    <main style={{ minHeight: '60vh', padding: '32px 20px', background: '#fff', color: '#172033', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700 }}>DigitalHood</h1>
        <p role="status">{slow ? 'The full marketplace is taking longer than usual. You can keep waiting or use the low-data catalogue.' : 'Opening the marketplace...'}</p>
        <RecoveryLinks />
      </div>
    </main>
  )
}

export class StartupBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) {
    window.__digitalhoodBootReady?.()
    console.error('DigitalHood storefront render failed', error, info.componentStack)
  }
  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main style={{ minHeight: '60vh', padding: '32px 20px', background: '#fff', color: '#172033', fontFamily: 'Arial, sans-serif' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <h1 style={{ fontSize: 26, fontWeight: 700 }}>DigitalHood could not open the full marketplace</h1>
          <p>A page download or browser feature may have failed. Your saved cart has not been cleared.</p>
          <button type="button" onClick={() => window.location.reload()}
            style={{ border: '1px solid #15125f', padding: '8px 14px', background: '#fff', color: '#15125f' }}>Try the full page again</button>
          <RecoveryLinks />
        </div>
      </main>
    )
  }
}
