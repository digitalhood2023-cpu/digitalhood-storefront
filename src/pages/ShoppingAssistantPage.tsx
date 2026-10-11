import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowRight, Loader2, Search, Sparkles } from 'lucide-react'
import { PRODUCT_IMAGE_FALLBACK } from '@/lib/productImages'
import Header from '@/sections/Header'
import Footer from '@/sections/Footer'
import SEO from '@/components/SEO'

type Product = { id: number; name: string; price: number; url: string; image?: string }
type Reply = { answer: string; products: Product[]; aiUsed: boolean }

export default function ShoppingAssistantPage() {
  const location = useLocation()
  const initialQuestion = typeof location.state?.question === 'string' ? location.state.question.slice(0, 500) : ''
  const [message, setMessage] = useState(initialQuestion)
  const input = useRef<HTMLTextAreaElement | null>(null)
  useEffect(() => {
    if (typeof location.state?.question === 'string') {
      setMessage(location.state.question.slice(0, 500))
      input.current?.focus()
    }
  }, [location.key, location.state])
  const [reply, setReply] = useState<Reply | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const active = useRef<AbortController | null>(null)
  useEffect(() => () => active.current?.abort(), [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy || message.trim().length < 3) return
    const controller = new AbortController()
    active.current = controller
    const timer = setTimeout(() => controller.abort(), 15000)
    setBusy(true); setError(''); setReply(null)
    try {
      const response = await fetch('https://ai.digitalhood.info/api/assistant/chat', {
        method: 'POST', credentials: 'omit', redirect: 'error',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() }), signal: controller.signal,
      })
      if (!response.ok) throw new Error(response.status === 429 ? 'Please wait a little before searching again.' : 'The assistant is temporarily unavailable. Please try the Shop page.')
      const body = await response.json()
      if (typeof body.answer !== 'string' || !Array.isArray(body.products)) throw new Error('The assistant could not complete this search. Please try the Shop page.')
      const products = body.products.filter((product: Product) => {
        try {
          const url = new URL(product.url)
          return Number.isSafeInteger(product.id) && Number.isFinite(product.price) && product.price > 0 && typeof product.name === 'string' && url.origin === 'https://store.digitalhood.info' && url.pathname.startsWith('/product/') && !url.username && !url.password
        } catch { return false }
      }).slice(0, 6)
      const illustratedProducts = products.map((product: Product) => {
        let image = PRODUCT_IMAGE_FALLBACK
        try {
          const candidate = new URL(product.image || '')
          if (candidate.protocol === 'https:' && !candidate.username && !candidate.password) image = candidate.href
        } catch { /* Keep the local placeholder. */ }
        return { ...product, image }
      })
      setReply({ answer: body.answer.slice(0, 1200), products: illustratedProducts, aiUsed: body.aiUsed === true })
    } catch (failure) {
      if (active.current === controller) setError(failure instanceof Error && failure.name !== 'AbortError' ? failure.message : 'The search took too long. Please try again or browse the Shop page.')
    } finally {
      clearTimeout(timer)
      if (active.current === controller) { active.current = null; setBusy(false) }
    }
  }

  const prompts = ['HP laptop charger under K1,000', 'JBL speaker', 'Compare power banks']
  return <>
    <SEO title="Shopping assistant | DigitalHood" description="Find current DigitalHood products by brand, product type and budget." />
    <Header />
    <main id="main-content" className="mx-auto w-full max-w-[1500px] px-4 py-3 sm:px-6 lg:px-8 xl:px-12">
      <section aria-labelledby="assistant-title" className="rounded-2xl border border-dh-light-gray bg-white p-3 shadow-sm sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <h1 id="assistant-title" className="flex items-center gap-2 text-lg font-bold text-dh-primary"><Sparkles className="h-5 w-5" aria-hidden="true" />DigitalHood AI</h1>
          <Link to="/shop" className="inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-dh-primary">Shop <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
        <form onSubmit={submit}>
          <label htmlFor="shopping-question" className="mb-2 block text-sm text-dh-dark-gray">What are you looking for?</label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <textarea ref={input} id="shopping-question" aria-describedby="shopping-privacy" required minLength={3} maxLength={500} value={message} onChange={event => setMessage(event.target.value)} placeholder="Try: HP charger under K1,000" rows={2} className="w-full min-w-0 flex-1 resize-y rounded-xl border border-dh-light-gray bg-dh-gray px-3 py-2 text-base text-dh-primary focus:border-dh-primary focus:outline-none focus:ring-2 focus:ring-dh-primary" />
            <button type="submit" disabled={busy || message.trim().length < 3} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-dh-primary px-5 py-3 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dh-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}{busy ? 'Searching…' : 'Find products'}
            </button>
          </div>
          <p id="shopping-privacy" className="mt-2 text-xs text-dh-dark-gray">Products only — leave out personal and payment details.</p>
        </form>
        <div aria-label="Suggested searches" className="mt-3 flex flex-wrap gap-2">{prompts.map(prompt => <button type="button" key={prompt} disabled={busy} onClick={() => { setMessage(prompt); input.current?.focus() }} className="min-h-10 rounded-full border border-dh-light-gray px-3 py-2 text-left text-xs font-semibold text-dh-primary hover:bg-dh-gray focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dh-primary disabled:opacity-50">{prompt}</button>)}</div>
      </section>

      <section aria-label="Shopping results" aria-busy={busy} className="mt-3 min-w-0">
        <div aria-live="polite">
          {error && <p role="alert" className="rounded-xl border border-dh-light-gray bg-dh-gray p-3 text-sm text-dh-primary">{error}</p>}
          {reply && <div className="rounded-xl border border-dh-light-gray bg-white p-3 text-sm text-dh-primary">
            <p className="whitespace-pre-line leading-relaxed">{reply.answer}</p>
            {reply.aiUsed && <p className="mt-2 text-xs text-dh-dark-gray">AI-assisted. Check the listing before buying.</p>}
          </div>}
          {busy && <p role="status" className="flex items-center gap-2 py-3 text-sm text-dh-dark-gray"><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />Searching current listings…</p>}
        </div>
        {!reply && !busy && !error && <p className="py-4 text-center text-sm text-dh-dark-gray">Search above to see matching products and prices.</p>}
        {busy && <div aria-hidden="true" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{[0,1,2,3].map(index => <div key={index} className="rounded-2xl border border-dh-light-gray bg-white p-2.5"><div className="aspect-square rounded-xl bg-dh-gray motion-safe:animate-pulse" /><div className="mt-3 h-4 w-3/4 rounded bg-dh-gray" /><div className="mt-2 h-4 w-1/3 rounded bg-dh-gray" /></div>)}</div>}
        {reply && reply.products.length > 0 && <>
          <div className="mb-2 mt-3 flex items-center justify-between gap-3"><h2 className="text-sm font-bold text-dh-primary">Matching products</h2><span className="text-xs text-dh-dark-gray">{reply.products.length} found</span></div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">{reply.products.map(product => <Link key={product.id} to={new URL(product.url).pathname} className="group min-w-0 overflow-hidden rounded-2xl border border-dh-light-gray bg-white p-2.5 transition-colors hover:border-dh-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dh-primary focus-visible:ring-offset-2">
            <div className="aspect-square overflow-hidden rounded-xl bg-white p-2">
              <img src={product.image} alt="" width={210} height={210} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={event => { if (event.currentTarget.getAttribute('src') !== PRODUCT_IMAGE_FALLBACK) event.currentTarget.src = PRODUCT_IMAGE_FALLBACK }} className="h-full w-full object-contain" />
            </div>
            <h3 className="mt-2 line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-dh-primary">{product.name}</h3>
            <p className="mt-2 text-base font-bold text-dh-primary">{new Intl.NumberFormat('en-ZM', { style: 'currency', currency: 'ZMW' }).format(product.price)}</p>
            <span className="mt-2 inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-dh-dark-gray">View product <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></span>
          </Link>)}</div>
        </>}
        {reply && reply.products.length === 0 && <Link to="/shop" className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-full border border-dh-light-gray px-4 py-2 text-sm font-semibold text-dh-primary">Browse the shop <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
      </section>
    </main>
    <Footer />
  </>
}
