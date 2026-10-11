import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import Header from '@/sections/Header'
import Footer from '@/sections/Footer'
import SEO from '@/components/SEO'

type Product = { id: number; name: string; price: number; url: string }
type Reply = { answer: string; products: Product[]; aiUsed: boolean }

export default function ShoppingAssistantPage() {
  const [message, setMessage] = useState('')
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
      setReply({ answer: body.answer.slice(0, 1200), products, aiUsed: body.aiUsed === true })
    } catch (failure) {
      if (active.current === controller) setError(failure instanceof Error && failure.name !== 'AbortError' ? failure.message : 'The search took too long. Please try again or browse the Shop page.')
    } finally {
      clearTimeout(timer)
      if (active.current === controller) { active.current = null; setBusy(false) }
    }
  }

  return <>
    <SEO title="Shopping assistant | DigitalHood" description="Find current DigitalHood products by brand, product type and budget." />
    <Header />
    <main id="main-content" className="mx-auto min-h-[65vh] max-w-5xl px-4 pb-16 pt-32">
      <h1 className="text-3xl font-bold">Find your next gadget</h1>
      <p className="mt-3 text-gray-600">Tell us the product, brand and budget you have in mind. We’ll search current DigitalHood listings.</p>
      <form onSubmit={submit} className="mt-8 rounded-2xl border bg-white p-5 shadow-sm">
        <label htmlFor="shopping-question" className="block font-semibold">What are you looking for?</label>
        <textarea id="shopping-question" required minLength={3} maxLength={500} value={message} onChange={event => setMessage(event.target.value)} placeholder="Find an HP laptop under K8,000" rows={3} className="mt-3 w-full rounded-lg border p-3 focus:outline-none focus:ring-2 focus:ring-orange-400" />
        <p className="mt-2 text-sm text-gray-500">Ask about products only. Please leave out personal, account and payment details.</p>
        <button type="submit" disabled={busy || message.trim().length < 3} className="mt-4 rounded-full bg-black px-6 py-3 font-semibold text-white disabled:opacity-50">{busy ? 'Searching…' : 'Find products'}</button>
        <Link to="/shop" className="ml-4 underline">Browse the shop</Link>
      </form>
      <div aria-live="polite" aria-busy={busy} className="mt-6">
        {error && <p role="alert" className="rounded-xl bg-orange-50 p-4">{error}</p>}
        {reply && <>
          <p className="rounded-xl bg-gray-50 p-5">{reply.answer}</p>
          {reply.aiUsed && <p className="mt-2 text-sm text-gray-500">AI-assisted explanation. Check the product listing before buying.</p>}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{reply.products.map(product => <Link key={product.id} to={new URL(product.url).pathname} className="rounded-xl border p-4 hover:border-orange-400">
            <h2 className="font-semibold">{product.name}</h2>
            <p className="mt-3 font-bold">{new Intl.NumberFormat('en-ZM', { style: 'currency', currency: 'ZMW' }).format(product.price)}</p>
            <span className="mt-3 block text-sm underline">View product and availability</span>
          </Link>)}</div>
        </>}
      </div>
    </main>
    <Footer />
  </>
}
