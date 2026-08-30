import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  ImagePlus,
  Loader2,
  MessageSquareText,
  PackageCheck,
  ShieldCheck,
  Star,
  Store,
  UserRoundCheck,
} from 'lucide-react'

import Header from '@/sections/Header'
import Footer from '@/sections/Footer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAccount } from '@/context/AccountContext'
import {
  getFeedbackEligibilities,
  getGivenFeedback,
  getReceivedFeedback,
  submitMarketplaceFeedback,
  uploadFeedbackMedia,
  type FeedbackEligibility,
  type MarketplaceFeedback,
} from '@/api/feedback'

type View = 'pending' | 'given' | 'received'

const TAGS = {
  product: [
    ['as_described', 'As described'],
    ['good_quality', 'Good quality'],
    ['good_value', 'Good value'],
    ['well_packaged', 'Well packaged'],
    ['damaged', 'Arrived damaged'],
    ['wrong_item', 'Wrong item'],
    ['counterfeit', 'May be counterfeit'],
    ['unsafe', 'Safety concern'],
  ],
  seller: [
    ['good_communication', 'Good communication'],
    ['fast_dispatch', 'Fast dispatch'],
    ['helpful', 'Helpful seller'],
    ['accurate_listing', 'Accurate listing'],
    ['poor_communication', 'Poor communication'],
    ['late_dispatch', 'Late dispatch'],
  ],
} as const

const DIMENSIONS = {
  product: [
    ['quality', 'Quality'],
    ['accuracy', 'Matches listing'],
    ['value', 'Value'],
    ['packaging', 'Packaging'],
  ],
  seller: [
    ['communication', 'Communication'],
    ['dispatch', 'Dispatch'],
    ['service', 'Service'],
  ],
} as const

function formatDate(value?: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('en-ZM', { dateStyle: 'medium' }).format(new Date(value))
}

function Stars({ value, onChange, compact = false }: { value: number; onChange?: (rating: number) => void; compact?: boolean }) {
  return (
    <div className="flex items-center gap-1" aria-label={`${value} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, index) => index + 1).map((rating) => {
        const Icon = onChange ? 'button' : 'span'
        return (
          <Icon
            key={rating}
            {...(onChange ? { type: 'button' as const, onClick: () => onChange(rating), 'aria-label': `Rate ${rating} stars` } : {})}
            className={onChange ? 'rounded p-0.5 transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-dh-primary/30' : ''}
          >
            <Star className={`${compact ? 'h-3.5 w-3.5' : 'h-6 w-6'} ${rating <= value ? 'fill-[#ffb54a] text-[#ffb54a]' : 'text-slate-300'}`} />
          </Icon>
        )
      })}
    </div>
  )
}

function FeedbackForm({ eligibility, onSubmitted }: { eligibility: FeedbackEligibility; onSubmitted: (message: string) => void }) {
  const target = eligibility.targetType === 'seller' ? 'seller' : 'product'
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [comment, setComment] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [dimensions, setDimensions] = useState<Record<string, number>>({})
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const toggleTag = (tag: string) => {
    setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag].slice(0, 8))
  }

  const submit = async () => {
    if (!rating) {
      setError('Choose a star rating first.')
      return
    }
    if (rating <= 3 && tags.length === 0) {
      setError('Select at least one reason tag for a rating of 3 stars or below.')
      return
    }
    setBusy(true)
    setError('')
    try {
      const uploaded = files.length
        ? await uploadFeedbackMedia(files)
        : { media: [] }
      const response = await submitMarketplaceFeedback({
        eligibilityId: eligibility.id,
        rating,
        title,
        comment,
        tags,
        dimensions,
        media: uploaded.media,
      })
      onSubmitted(response.moderation.message)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to send feedback.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-black text-dh-primary">Your overall rating</p>
          <p className="text-[11px] text-slate-500">Based on this delivered purchase only.</p>
        </div>
        <Stars value={rating} onChange={setRating} />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {DIMENSIONS[target].map(([key, label]) => (
          <div key={key} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2">
            <span className="text-[11px] font-bold text-slate-600">{label}</span>
            <Stars compact value={dimensions[key] || 0} onChange={(value) => setDimensions((current) => ({ ...current, [key]: value }))} />
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {TAGS[target].map(([tag, label]) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${tags.includes(tag) ? 'border-dh-primary bg-dh-primary text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-dh-primary/40'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-2">
        <Input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="Short headline (optional)" className="h-9 rounded-xl text-sm" />
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value.slice(0, 2000))}
          rows={3}
          placeholder={`Tell shoppers about the ${target === 'product' ? 'item' : 'seller'} (optional)`}
          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-dh-primary focus:ring-2 focus:ring-dh-primary/10"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="inline-flex h-9 cursor-pointer items-center rounded-full border border-slate-200 bg-white px-3 text-[11px] font-black text-dh-primary transition hover:border-dh-primary/40">
          <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
          Add photos/video
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
            multiple
            className="sr-only"
            onChange={(event) => {
              const selected = Array.from(event.target.files || []).slice(0, 5)
              if (selected.filter((file) => file.type.startsWith('video/')).length > 1) {
                setError('Add no more than one short video.')
                return
              }
              setError('')
              setFiles(selected)
            }}
          />
        </label>
        {files.length > 0 && (
          <span className="text-[10px] font-bold text-slate-500">
            {files.length} file{files.length === 1 ? '' : 's'} · images compressed before upload
          </span>
        )}
      </div>

      {error && <p className="mt-2 text-xs font-bold text-red-700">{error}</p>}
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[10px] leading-4 text-slate-500">Published feedback is linked to a verified delivery. Contact details and abusive content are held for review.</p>
        <Button type="button" onClick={submit} disabled={busy} className="h-9 shrink-0 rounded-full bg-dh-primary px-4 text-xs font-black text-white">
          {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />}
          Publish
        </Button>
      </div>
    </div>
  )
}

function EligibilityCard({ item, selected, onSelect, onSubmitted }: { item: FeedbackEligibility; selected: boolean; onSelect: () => void; onSubmitted: (message: string) => void }) {
  const isProduct = item.targetType === 'product'
  return (
    <article className={`rounded-2xl border bg-white p-3 shadow-sm transition ${selected ? 'border-dh-primary/40 ring-2 ring-dh-primary/5' : 'border-slate-200'}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
          {isProduct && item.product?.imageUrl ? (
            <img src={item.product.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <Store className="h-5 w-5 text-dh-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">Verified delivery</span>
            <span className="text-[10px] font-semibold text-slate-400">Order #{item.orderNumber}</span>
          </div>
          <p className="mt-1 truncate text-sm font-black text-dh-primary">{item.targetDisplayName}</p>
          <p className="text-[11px] text-slate-500">Delivered {formatDate(item.deliveredAt)} · Review by {formatDate(item.closesAt)}</p>
        </div>
        <button type="button" onClick={onSelect} className="shrink-0 rounded-full bg-dh-primary px-3 py-1.5 text-[11px] font-black text-white">
          {selected ? 'Close' : 'Review'}
        </button>
      </div>
      {selected && <FeedbackForm eligibility={item} onSubmitted={onSubmitted} />}
    </article>
  )
}

function GivenCard({ feedback }: { feedback: MarketplaceFeedback }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-dh-primary">{feedback.targetDisplayName}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Stars compact value={feedback.rating} />
            <span className="text-[10px] font-semibold text-slate-400">{formatDate(feedback.submittedAt)}</span>
          </div>
        </div>
        <span className={`rounded-full px-2 py-1 text-[10px] font-black ${feedback.moderationStatus === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {feedback.moderationStatus === 'published' ? 'Live' : 'Under review'}
        </span>
      </div>
      {feedback.title && <p className="mt-2 text-xs font-black text-slate-800">{feedback.title}</p>}
      {feedback.comment && <p className="mt-1 text-xs leading-5 text-slate-600">{feedback.comment}</p>}
      {feedback.response && (
        <div className="mt-2 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600">
          <span className="font-black text-dh-primary">Seller response: </span>{feedback.response.text}
        </div>
      )}
    </article>
  )
}

function ReceivedCard({ feedback }: { feedback: MarketplaceFeedback }) {
  return (
    <article className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100">
      <div className="flex items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><UserRoundCheck className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-dh-primary">{feedback.authorName || 'Marketplace seller'}</p><div className="mt-1 flex items-center gap-2"><Stars compact value={feedback.rating} /><span className="text-[10px] font-semibold text-slate-400">{formatDate(feedback.submittedAt)}</span></div></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-700">Verified order</span></div>
      {feedback.comment && <p className="mt-2 text-xs leading-5 text-slate-600">{feedback.comment}</p>}
      <p className="mt-2 text-[10px] font-bold text-slate-400">Positive transaction feedback from a seller you bought from.</p>
    </article>
  )
}

export default function AccountFeedbackPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { isAuthenticated, isLoading: accountLoading } = useAccount()
  const [view, setView] = useState<View>('pending')
  const [eligibilities, setEligibilities] = useState<FeedbackEligibility[]>([])
  const [given, setGiven] = useState<MarketplaceFeedback[]>([])
  const [received, setReceived] = useState<MarketplaceFeedback[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [pendingResponse, givenResponse, receivedResponse] = await Promise.all([
        getFeedbackEligibilities({ orderId: params.get('order') || undefined, limit: 50 }),
        getGivenFeedback(),
        getReceivedFeedback(),
      ])
      setEligibilities(pendingResponse.eligibilities)
      setGiven(givenResponse.feedback)
      setReceived(receivedResponse.feedback)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load feedback.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!accountLoading && !isAuthenticated) navigate('/login?redirect=/account/feedback', { replace: true })
  }, [accountLoading, isAuthenticated, navigate])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (isAuthenticated) void load()
    }, 0)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, params.toString()])

  const pending = useMemo(
    () => eligibilities.filter((item) => item.status === 'eligible'),
    [eligibilities]
  )

  const submitted = (message: string) => {
    setNotice(message)
    setSelectedId('')
    void load()
  }

  return (
    <div className="flex min-h-[100svh] flex-col bg-dh-gray">
      <Header />
      <main className="flex-1 py-4 lg:py-7">
        <div className="container mx-auto max-w-5xl px-3 sm:px-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Link to="/account" className="inline-flex items-center gap-1 text-xs font-bold text-dh-primary"><ArrowLeft className="h-3.5 w-3.5" /> My account</Link>
            <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-emerald-700 shadow-sm"><BadgeCheck className="h-3.5 w-3.5" /> Verified purchases only</span>
          </div>

          <section className="overflow-hidden rounded-2xl bg-dh-primary p-4 text-white shadow-sm sm:p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10"><MessageSquareText className="h-5 w-5 text-[#ffb54a]" /></span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#ffcf87]">Marketplace trust</p>
                <h1 className="font-display text-xl font-black">Feedback centre</h1>
                <p className="mt-0.5 text-xs text-white/65">Rate delivered products and sellers. Your verified experience helps the whole marketplace.</p>
              </div>
            </div>
          </section>

          <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-2xl bg-white p-1.5 shadow-sm">
            <button type="button" onClick={() => setView('pending')} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black ${view === 'pending' ? 'bg-dh-primary text-white' : 'text-slate-600'}`}>
              <Clock3 className="h-4 w-4" /> To review <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">{pending.length}</span>
            </button>
            <button type="button" onClick={() => setView('given')} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-black ${view === 'given' ? 'bg-dh-primary text-white' : 'text-slate-600'}`}>
              <CheckCircle2 className="h-4 w-4" /> Given <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">{given.length}</span>
            </button>
            <button type="button" onClick={() => setView('received')} className={`flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-black ${view === 'received' ? 'bg-dh-primary text-white' : 'text-slate-600'}`}>
              <UserRoundCheck className="h-4 w-4" /> Received <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">{received.length}</span>
            </button>
          </div>

          {notice && <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">{notice}</div>}
          {error && <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-bold text-red-700">{error}</div>}

          <section className="mt-3 grid gap-2.5">
            {loading || accountLoading ? (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm"><Loader2 className="mx-auto h-7 w-7 animate-spin text-dh-primary" /><p className="mt-2 text-xs font-bold text-slate-500">Loading verified purchases…</p></div>
            ) : view === 'pending' && pending.length ? (
              pending.map((item) => <EligibilityCard key={item.id} item={item} selected={selectedId === item.id} onSelect={() => setSelectedId((current) => current === item.id ? '' : item.id)} onSubmitted={submitted} />)
            ) : view === 'given' && given.length ? (
              given.map((item) => <GivenCard key={item.id} feedback={item} />)
            ) : view === 'received' && received.length ? (
              received.map((item) => <ReceivedCard key={item.id} feedback={item} />)
            ) : (
              <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
                <PackageCheck className="mx-auto h-9 w-9 text-dh-primary" />
                <h2 className="mt-2 font-display text-lg font-black text-dh-primary">{view === 'pending' ? 'You are all caught up' : view === 'received' ? 'No seller feedback yet' : 'No feedback yet'}</h2>
                <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">{view === 'pending' ? 'Eligible delivered purchases will appear here for 90 days.' : view === 'received' ? 'Positive feedback from sellers after delivered transactions will appear here.' : 'Feedback you publish will stay available here with seller responses.'}</p>
                <Button asChild className="mt-4 h-9 rounded-full bg-dh-primary px-4 text-xs"><Link to="/orders">View orders</Link></Button>
              </div>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
