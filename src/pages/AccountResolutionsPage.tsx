import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Loader2, MessageSquare, RefreshCw, ShieldCheck } from 'lucide-react'
import { getCustomerOrder, type AccountOrder } from '@/api/account'
import { actOnResolution, createResolution, getResolution, listResolutions, resolutionLabel, sendResolutionMessage, type OrderResolution, type ResolutionRequest, type ResolutionSummary } from '@/api/resolutions'
import { useAccount } from '@/context/AccountContext'
import { Button } from '@/components/ui/button'
import { formatOrderDate, formatOrderMoney } from '@/lib/orderTracking'
import Header from '@/sections/Header'
import Footer from '@/sections/Footer'

const panel = 'rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900'
const input = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base font-normal text-slate-950 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100'
const reasons = [['ordered_by_mistake', 'Ordered by mistake'], ['changed_mind', 'Changed my mind'], ['not_received', 'Not received'], ['damaged', 'Damaged or faulty'], ['not_as_described', 'Not as described'], ['wrong_item', 'Wrong item'], ['missing_items', 'Missing items'], ['counterfeit', 'Suspected counterfeit'], ['other', 'Other']]

function RequestForm({ order, onCreated }: { order: AccountOrder; onCreated: (id: string) => void }) {
  const [kind, setKind] = useState('refund'), [reason, setReason] = useState('damaged'), [description, setDescription] = useState('')
  const [selected, setSelected] = useState<Record<string, number>>({})
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const request = useRef<{ fingerprint: string; key: string } | null>(null)
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const payload: ResolutionRequest = {kind, reason, description: description.trim(), items: Object.entries(selected).filter(([, quantity]) => quantity > 0).map(([lineId, quantity]) => ({lineId, quantity}))}
    if (!payload.items.length) { setError('Select at least one item.'); return }
    const fingerprint = JSON.stringify(payload)
    if (request.current?.fingerprint !== fingerprint) request.current = {fingerprint, key: crypto.randomUUID()}
    setBusy(true); setError('')
    try { const result = await createResolution(String(order.id), payload, request.current.key); onCreated(result.resolution.resolution_id) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Request could not be confirmed. Retry safely with the same details.') }
    finally { setBusy(false) }
  }
  return <form onSubmit={submit} className={`${panel} space-y-3`}>
    <h2 className="font-bold">What needs resolving?</h2>
    <div className="divide-y divide-slate-200 dark:divide-slate-700">{order.items?.map(item => <div key={item.id} className="flex items-center gap-3 py-2">
      <input aria-label={`Select ${item.name}`} type="checkbox" checked={Boolean(selected[item.id])} onChange={event => setSelected({...selected, [item.id]: event.target.checked ? 1 : 0})} disabled={busy} className="h-4 w-4 shrink-0 accent-[#29217d]" />
      {item.image && <img src={item.image} alt="" className="h-10 w-10 rounded-md object-contain" />}
      <span className="min-w-0 flex-1 text-sm font-semibold">{item.name}<span className="block text-xs font-normal text-slate-500 dark:text-slate-400">Purchased {item.quantity}</span></span>
      {!!selected[item.id] && <input aria-label={`Quantity for ${item.name}`} type="number" min={1} max={item.quantity} step={1} required value={selected[item.id]} disabled={busy} onChange={event => setSelected({...selected, [item.id]: Math.max(1, Math.min(item.quantity, Math.floor(Number(event.target.value) || 1)))})} className={`${input} !w-16 !px-2`} />}
    </div>)}</div>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-xs font-semibold">Request<select value={kind} onChange={event => setKind(event.target.value)} disabled={busy} className={`${input} mt-1`}><option value="cancellation">Cancel selected items</option><option value="return">Return selected items</option><option value="refund">Request a refund</option><option value="replacement">Request a replacement</option></select></label>
      <label className="text-xs font-semibold">Reason<select value={reason} onChange={event => setReason(event.target.value)} disabled={busy} className={`${input} mt-1`}>{reasons.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
    </div>
    <label className="block text-xs font-semibold">Tell us what happened<textarea required minLength={10} maxLength={4000} rows={3} value={description} onChange={event => setDescription(event.target.value)} disabled={busy} className={`${input} mt-1`} placeholder="Describe the issue and the outcome you need. Never include card details or payment PINs." /></label>
    <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">Submitting sends a request for review. It does not yet cancel dispatch or confirm a refund. We’ll show the decision and any payment progress here.</p>
    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
    <Button type="submit" disabled={busy} className="h-9">{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Submit request</Button>
  </form>
}

function CaseDetail({ item, refresh }: { item: OrderResolution; refresh: () => Promise<void> }) {
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [action, setAction] = useState<'withdrawn' | 'appealed' | null>(null), [note, setNote] = useState('')
  const pending = useRef<{ message: string; key: string } | null>(null)
  async function send(event: FormEvent) {
    event.preventDefault(); if (busy || !message.trim()) return
    const value = message.trim()
    if (pending.current?.message !== value) pending.current = {message: value, key: crypto.randomUUID()}
    setBusy(true); setError('')
    try { await sendResolutionMessage(item.resolution_id, value, pending.current.key); setMessage(''); pending.current = null; await refresh() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to send your reply.') }
    finally { setBusy(false) }
  }
  async function confirmAction(event: FormEvent) {
    event.preventDefault()
    if (busy || !action || note.trim().length < 10) return
    setBusy(true); setError('')
    try {await actOnResolution(item.resolution_id, item.version, action, note.trim()); setAction(null); setNote(''); await refresh()}
    catch (cause) {setError(cause instanceof Error ? cause.message : 'Action could not be confirmed. Refresh before retrying.')}
    finally {setBusy(false)}
  }
  return <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
    <section className={`${panel} min-w-0`}>
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold">{resolutionLabel(item.status)}</h2><span className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">{resolutionLabel(item.kind)}</span></div>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm">{item.description}</p>
      {error && <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
      <h3 className="mt-4 border-t border-slate-200 pt-3 text-xs font-bold uppercase tracking-wide dark:border-slate-700">Case updates</h3>
      <ol className="mt-2 space-y-3">{item.events.map(event => <li key={event.version} className="border-l-2 border-slate-200 pl-3 dark:border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><strong>{event.event_type === 'resolution.message' ? `${event.data.role === 'customer' ? 'Your' : event.data.role === 'seller' ? 'Seller' : 'DigitalHood'} reply` : resolutionLabel(event.event_type.replace(/^(resolution|refund)\./, ''))}</strong><time className="text-slate-500 dark:text-slate-400">{formatOrderDate(event.created_at)}</time></div>
        {(event.data.message || event.data.note) && <p className="mt-1 whitespace-pre-wrap break-words text-sm">{event.data.message || event.data.note}</p>}
      </li>)}</ol>
      {item.events.length >= 100 && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Showing the latest 100 updates.</p>}
      {!['resolved', 'withdrawn'].includes(item.status) && <form onSubmit={send} className="mt-4 space-y-2"><label className="block text-xs font-semibold">Add information<textarea rows={2} maxLength={2000} required disabled={busy} value={message} onChange={event => setMessage(event.target.value)} className={`${input} mt-1`} /></label><Button type="submit" className="h-9" disabled={busy || !message.trim()}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}Send reply</Button></form>}
    </section>
    <aside className="space-y-3"><section className={panel}><h2 className="text-sm font-bold">Selected items</h2><div className="mt-2 divide-y divide-slate-200 dark:divide-slate-700">{item.lines.map(line => <div key={line.line_id} className="flex justify-between gap-3 py-2 text-sm"><div className="min-w-0"><span className="break-words">{line.name}</span><small className="block text-slate-500 dark:text-slate-400">Quantity {line.unit_numbers.length}</small></div><span className="shrink-0 font-semibold">{formatOrderMoney(String(Number(line.amount_minor) / 100), item.currency)}</span></div>)}</div><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Amounts paid for selected items; any shipping adjustment is reviewed separately.</p></section>
      {item.refund && <section className={panel}><h2 className="text-sm font-bold">{resolutionLabel(item.refund.status)}</h2><p className="mt-1 text-lg font-bold">{formatOrderMoney(String(Number(item.refund.amount_minor) / 100), item.refund.currency)}</p><p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">Refunds return through the original payment where supported. Bank and provider processing times can vary.</p></section>}
      <Link to={`/track-order/${item.order_id}`} className="inline-flex items-center gap-2 text-sm font-semibold">View order #{item.order_id}<ArrowRight className="h-4 w-4" /></Link>
      {(['requested', 'awaiting_buyer', 'declined'].includes(item.status)) && <section className={panel}>
        {!action ? <button type="button" disabled={busy} onClick={() => setAction(item.status === 'declined' ? 'appealed' : 'withdrawn')} className="text-sm font-semibold underline">{item.status === 'declined' ? 'Ask for a decision review' : 'Withdraw this request'}</button> : <form onSubmit={confirmAction} className="space-y-2"><h3 className="text-sm font-bold">{action === 'appealed' ? 'Request a review' : 'Withdraw this request?'}</h3><p className="text-xs leading-5 text-slate-600 dark:text-slate-300">{action === 'appealed' ? 'Explain what was missed or what new information should be considered.' : 'This closes the support request, not the order. It does not cancel delivery or move money.'}</p><label className="block text-xs font-semibold">Reason<textarea value={note} onChange={event => setNote(event.target.value)} minLength={10} maxLength={2000} rows={2} required disabled={busy} className={`${input} mt-1`} /></label><div className="flex gap-2"><Button type="submit" className="h-9" disabled={busy || note.trim().length < 10}>Confirm</Button><Button type="button" variant="outline" className="h-9" disabled={busy} onClick={() => setAction(null)}>Back</Button></div></form>}
      </section>}
    </aside>
  </div>
}

function AccountResolutionWorkspace({orderId, resolutionId, customerId}: {orderId?: string; resolutionId?: string; customerId: number | string}) {
  const navigate = useNavigate()
  const [order, setOrder] = useState<AccountOrder | null>(null), [detail, setDetail] = useState<OrderResolution | null>(null)
  const [items, setItems] = useState<ResolutionSummary[]>([]), [cursor, setCursor] = useState<string | null>(null)
  const [busy, setBusy] = useState(true), [error, setError] = useState('')
  const generation = useRef(Symbol())
  const load = useCallback((more = false, before?: string) => {
    const run = Symbol(); generation.current = run
    const task = resolutionId
      ? getResolution(resolutionId).then(response => {if (run === generation.current) setDetail(response.resolution)})
      : Promise.all([listResolutions(orderId, more ? before : undefined), orderId && !more ? getCustomerOrder(orderId) : Promise.resolve(null)]).then(([result, orderResult]) => {
        if (run === generation.current) {setItems(previous => more ? [...previous, ...result.items] : result.items); setCursor(result.nextCursor); if (orderResult) setOrder(orderResult.order)}
      })
    return task.catch(cause => {if (run === generation.current) setError(cause instanceof Error ? cause.message : 'Unable to load resolutions.')}).finally(() => {if (run === generation.current) setBusy(false)})
  }, [orderId, resolutionId])
  useEffect(() => {
    void load()
    return () => { generation.current = Symbol() }
  }, [load])
  async function refresh(more = false, before?: string) {
    setBusy(true); setError(''); await load(more, before)
  }
  return <>
    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><Link to={orderId ? `/track-order/${orderId}` : '/account'} aria-label="Back"><ArrowLeft className="h-5 w-5" /></Link><h1 className="text-lg font-bold">{orderId ? `Resolve order #${orderId}` : 'Returns & resolutions'}</h1></div><button type="button" aria-label="Refresh cases" disabled={busy} onClick={() => void refresh()} className="rounded-lg border border-slate-300 p-2 dark:border-slate-600"><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /></button></div>
      {error && <div role="alert" className={`${panel} text-sm text-red-700 dark:text-red-300`}>{error}<Link to={orderId ? `/account/orders/${orderId}/report` : '/account/support-cases'} className="ml-2 underline">Existing order support</Link></div>}
      {busy && !detail && !items.length && <p role="status" className="text-sm">Loading your cases…</p>}
      {resolutionId && detail ? <CaseDetail key={detail.resolution_id} item={detail} refresh={() => refresh()} /> : <>
        {!!items.length && <section className={`${panel} !p-0`} aria-label="Your requests"><ul className="divide-y divide-slate-200 dark:divide-slate-700">{items.map(item => <li key={item.resolution_id}><Link to={`/account/resolutions/${item.resolution_id}`} className="flex items-center justify-between gap-3 px-3 py-3 hover:bg-slate-100 dark:hover:bg-slate-800"><div className="min-w-0"><strong className="text-sm">Order #{item.order_id} · {resolutionLabel(item.kind)}</strong><p className="text-xs text-slate-500 dark:text-slate-400">{resolutionLabel(item.reason)} · {formatOrderDate(item.created_at)}</p></div><span className="text-right text-xs font-semibold">{resolutionLabel(item.status)}</span><ArrowRight className="h-4 w-4 shrink-0" /></Link></li>)}</ul></section>}
        {cursor && <Button variant="outline" disabled={busy} onClick={() => void refresh(true, cursor)}>Load more requests</Button>}
        {!busy && !error && !items.length && !orderId && <section className={panel}><p className="text-sm">No requests yet. Open an order to select the items you need help with.</p><Link to="/orders" className="mt-2 inline-block text-sm font-bold underline">View your orders</Link></section>}
        {order && !error && <RequestForm key={`${customerId}:${order.id}`} order={order} onCreated={id => navigate(`/account/resolutions/${id}`)} />}
      </>}
  </>
}

export default function AccountResolutionsPage() {
  const {orderId, resolutionId} = useParams()
  const {customer, isAuthenticated, isLoading} = useAccount()
  return <><Header /><main className="bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-100"><div className="mx-auto max-w-6xl space-y-3 px-3 py-4">
    {isLoading ? <p role="status" className="text-sm">Checking your account…</p> : !isAuthenticated || !customer ? <section className={panel}><h1 className="text-lg font-bold">Returns & resolutions</h1><p className="my-2 text-sm">Sign in to manage requests linked to your purchases.</p><Button asChild><Link to="/login">Sign in</Link></Button></section> : <AccountResolutionWorkspace key={`${customer.id}:${orderId}:${resolutionId}`} customerId={customer.id} orderId={orderId} resolutionId={resolutionId} />}
  </div></main><Footer /></>
}
