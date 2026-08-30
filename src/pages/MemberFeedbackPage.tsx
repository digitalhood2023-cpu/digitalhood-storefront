import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, BadgeCheck, Loader2, ShieldCheck, Star, UserRound } from 'lucide-react'

import Header from '@/sections/Header'
import Footer from '@/sections/Footer'
import { getPublicFeedback, type FeedbackSummary, type MarketplaceFeedback } from '@/api/feedback'

export default function MemberFeedbackPage() {
  const { memberKey = '' } = useParams()
  const [summary, setSummary] = useState<FeedbackSummary | null>(null)
  const [feedback, setFeedback] = useState<MarketplaceFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const timer = window.setTimeout(() => {
      setLoading(true)
      getPublicFeedback('members', memberKey)
        .then((response) => {
          if (!active) return
          setSummary(response.summary)
          setFeedback(response.feedback)
        })
        .catch((caught) => {
          if (active) setError(caught instanceof Error ? caught.message : 'Unable to load member feedback.')
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }, 0)
    return () => { active = false; window.clearTimeout(timer) }
  }, [memberKey])

  return (
    <div className="flex min-h-[100svh] flex-col bg-dh-gray">
      <Header />
      <main className="mx-auto w-full max-w-3xl flex-1 px-3 py-5 sm:px-5">
        <Link to="/shop" className="inline-flex items-center gap-1 text-xs font-bold text-dh-primary"><ArrowLeft className="h-3.5 w-3.5" /> Marketplace</Link>
        <section className="mt-3 rounded-2xl bg-dh-primary p-4 text-white shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10"><UserRound className="h-6 w-6 text-[#ffb54a]" /></span>
            <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#ffcf87]">Marketplace member</p><h1 className="font-display text-xl font-black">Buyer feedback profile</h1><p className="mt-0.5 text-xs text-white/65">Only positive feedback from completed marketplace orders is public.</p></div>
            <div className="text-right"><p className="text-2xl font-black">{summary?.count ? summary.averageRating.toFixed(1) : '—'}</p><p className="text-[10px] font-bold text-white/55">{summary?.count || 0} ratings</p></div>
          </div>
        </section>

        {loading ? (
          <div className="mt-3 rounded-2xl bg-white p-8 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-dh-primary" /></div>
        ) : error ? (
          <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>
        ) : feedback.length ? (
          <section className="mt-3 grid gap-2.5">
            {feedback.map((item) => (
              <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2"><span className="inline-flex items-center gap-1 text-xs font-black text-emerald-700"><BadgeCheck className="h-3.5 w-3.5" /> Completed order</span><span className="flex gap-0.5">{Array.from({ length: 5 }).map((_, index) => <Star key={index} className={`h-3.5 w-3.5 ${index < item.rating ? 'fill-[#ffb54a] text-[#ffb54a]' : 'text-slate-300'}`} />)}</span></div>
                {item.comment && <p className="mt-2 text-sm leading-6 text-slate-600">{item.comment}</p>}
                <p className="mt-2 text-[10px] font-bold text-slate-400">From a verified marketplace seller</p>
              </article>
            ))}
          </section>
        ) : (
          <div className="mt-3 rounded-2xl bg-white p-8 text-center shadow-sm"><ShieldCheck className="mx-auto h-8 w-8 text-dh-primary" /><h2 className="mt-2 font-display text-lg font-black text-dh-primary">No public buyer feedback yet</h2><p className="mt-1 text-xs text-slate-500">Private reports and Trust team activity are never shown here.</p></div>
        )}
      </main>
      <Footer />
    </div>
  )
}
