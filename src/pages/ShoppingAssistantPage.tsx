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
    <main id="main-content" className="mx-auto min-h-screen max-w-6xl px-4 pb-16 pt-32 sm:px-6">
      <section className="relative overflow-hidden rounded-3xl border border-amber-100 bg-amber-50 px-6 py-8 sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-amber-800">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> DigitalHood AI
        </div>
        <h1 className="mt-5 max-w-xl font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">A little help finding<br className="hidden sm:block" /> your next gadget.</h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">Tell us what you need and your budget. Explore current listings, compare your options and find a good place to start.</p>
        <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
          <span>Current catalogue</span><span>Prices in Kwacha</span><span>You choose what to buy</span>
        </div>
      </section>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-3">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <form onSubmit={submit}>
            <label htmlFor="shopping-question" className="block text-lg font-bold text-slate-950">What are you looking for?</label>
            <p id="shopping-hint" className="mt-2 text-sm leading-relaxed text-slate-500">A product, brand or budget is a good start.</p>
            <textarea ref={input} id="shopping-question" aria-describedby="shopping-hint shopping-privacy" required minLength={3} maxLength={500} value={message} onChange={event => setMessage(event.target.value)} placeholder="Try: HP laptop charger under K1,000" rows={4} className="mt-4 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 text-base text-slate-950 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400" />
            <button type="submit" disabled={busy || message.trim().length < 3} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}
              {busy ? 'Finding products…' : 'Find products'}
            </button>
            <p id="shopping-privacy" className="mt-4 text-xs leading-relaxed text-slate-500">Ask about products only. Please leave out personal, account and payment details.</p>
          </form>
          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Try a quick search</p>
            <div className="mt-3 flex flex-wrap gap-2">{prompts.map(prompt => <button type="button" key={prompt} disabled={busy} onClick={() => { setMessage(prompt); input.current?.focus() }} className="rounded-full border border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-700 transition-colors hover:border-amber-400 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 disabled:opacity-50">{prompt}</button>)}</div>
          </div>
          <Link to="/shop" className="mt-6 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-slate-700 underline underline-offset-4">Explore the full shop <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </section>

        <section aria-label="Shopping results" aria-busy={busy} className="min-w-0 lg:col-span-2">
          <div aria-live="polite">
            {error && <p role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-slate-800">{error}</p>}
            {reply && <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800"><Sparkles className="h-4 w-4" aria-hidden="true" /> {reply.aiUsed ? 'Your shopping guide' : 'Catalogue results'}</div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{reply.answer}</p>
              {reply.aiUsed && <p className="mt-3 text-xs text-slate-500">AI-assisted explanation. Check the listing before buying.</p>}
            </div>}
            {busy && <p role="status" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-600"><Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Searching current DigitalHood listings…</p>}
          </div>
          {!reply && !busy && !error && <div className="flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-8 py-10 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 text-amber-800"><Sparkles className="h-6 w-6" aria-hidden="true" /></span>
            <h2 className="mt-5 text-lg font-bold text-slate-950">Your shortlist starts here</h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">Ask a question or choose a quick search. Matching products will appear here with photos, current prices and links to their listings.</p>
          </div>}
          {busy && <div aria-hidden="true" className="mt-5 grid gap-4 sm:grid-cols-2">{[0,1].map(index => <div key={index} className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4"><div className="aspect-[4/3] rounded-xl bg-slate-100 motion-safe:animate-pulse" /><div className="mt-4 h-4 w-3/4 rounded bg-slate-100" /><div className="mt-3 h-4 w-1/3 rounded bg-slate-100" /></div>)}</div>}
          {reply && reply.products.length > 0 && <>
            <div className="mb-4 mt-6 flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-slate-950">Products to explore</h2><span className="text-xs text-slate-500">{reply.products.length} matches</span></div>
            <div className="grid gap-4 sm:grid-cols-2">{reply.products.map(product => <Link key={product.id} to={new URL(product.url).pathname} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors hover:border-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2">
              <div className="aspect-[4/3] overflow-hidden border-b border-slate-100 bg-white p-5">
                <img src={product.image} alt="" width={420} height={315} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={event => { if (event.currentTarget.getAttribute('src') !== PRODUCT_IMAGE_FALLBACK) event.currentTarget.src = PRODUCT_IMAGE_FALLBACK }} className="h-full w-full object-contain" />
              </div>
              <div className="flex flex-col p-5">
                <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-slate-800">{product.name}</h3>
                <p className="mt-4 text-xl font-bold tracking-tight text-slate-950">{new Intl.NumberFormat('en-ZM', { style: 'currency', currency: 'ZMW' }).format(product.price)}</p>
                <span className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-slate-600 group-hover:text-amber-700">View product <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
              </div>
            </Link>)}</div>
          </>}
          {reply && reply.products.length === 0 && <Link to="/shop" className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold">Browse all products <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
        </section>
      </div>
    </main>
    <Footer />
  </>
}
