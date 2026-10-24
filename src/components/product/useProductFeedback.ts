import { useCallback, useEffect, useRef, useState } from 'react'
import { publishedProductId, requestProductFeedback, type ProductFeedback } from './productFeedback'

const api = import.meta.env.VITE_PAYMENTS_API_URL || 'https://payments.digitalhood.info'
type State = { productId: number | null; data: ProductFeedback | null; loading: boolean; error: string }

export function useProductFeedback(value: unknown) {
  const productId = publishedProductId(value)
  const [state, setState] = useState<State>({ productId: null, data: null, loading: false, error: '' })
  const request = useRef<{ sequence: number; controller?: AbortController }>({ sequence: 0 })
  const lastStarted = useRef(0)
  const load = useCallback(async (page = 1) => {
    if (!productId) return
    request.current.controller?.abort()
    const controller = new AbortController(), sequence = ++request.current.sequence
    request.current.controller = controller
    lastStarted.current = Date.now()
    setState(previous => ({ productId, data: previous.productId === productId ? previous.data : null, loading: true, error: '' }))
    const timer = window.setTimeout(() => controller.abort(), 12_000)
    try {
      const data = await requestProductFeedback(api, productId, page, controller.signal)
      if (request.current.sequence !== sequence) return
      setState(previous => ({ productId, loading: false, error: '', data: page > 1 && previous.productId === productId && previous.data
        ? { ...data, reviews: [...new Map([...previous.data.reviews, ...data.reviews].map(row => [row.id, row])).values()] }
        : data }))
    } catch {
      if (request.current.sequence === sequence) setState(previous => ({ ...previous, loading: false, error: 'Buyer feedback is temporarily unavailable. Please retry.' }))
    } finally { window.clearTimeout(timer) }
  }, [productId])

  useEffect(() => {
    if (!productId) return
    const activeRequest = request.current
    void load()
    const revalidate = () => { if (document.visibilityState === 'visible' && Date.now() - lastStarted.current >= 30_000) void load() }
    window.addEventListener('focus', revalidate)
    document.addEventListener('visibilitychange', revalidate)
    const timer = window.setInterval(revalidate, 60_000)
    return () => {
      ++activeRequest.sequence
      activeRequest.controller?.abort()
      window.removeEventListener('focus', revalidate)
      document.removeEventListener('visibilitychange', revalidate)
      window.clearInterval(timer)
    }
  }, [productId, load])

  // Never show product A's feedback while a route change is loading product B.
  const current = state.productId === productId ? state : { productId, data: null, loading: Boolean(productId), error: '' }
  return { ...current, refresh: () => load(), loadMore: () => load((current.data?.page || 1) + 1) }
}
