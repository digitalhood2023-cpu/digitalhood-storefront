import {useRef, useState, type FormEvent} from 'react'
import {acknowledgeManualRefund, type RefundOffer} from '@/api/resolutions'
import {Button} from '@/components/ui/button'

export default function ManualRefundReceipt({id, offer, refresh}: {id: string; offer: RefundOffer; refresh: () => Promise<void>}) {
  const [action, setAction] = useState<'buyer_confirmed' | 'disputed' | null>(null), [note, setNote] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const pending = useRef<{signature: string; key: string} | null>(null)
  const report = offer.manual_report
  if (!report) return null
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy || !action || !report || note.trim().length < 10) return
    const signature = JSON.stringify([offer.offer_id, report.version, action, note.trim()])
    if (pending.current?.signature !== signature) pending.current = {signature, key: crypto.randomUUID()}
    setBusy(true); setError('')
    try {await acknowledgeManualRefund(id, offer, action, note.trim(), pending.current.key); pending.current = null; setAction(null); await refresh()}
    catch (cause) {setError(cause instanceof Error ? cause.message : 'Unable to save your response. Retry safely.')}
    finally {setBusy(false)}
  }
  return <div className="mt-2 space-y-2" aria-label="Manual refund receipt">
    <h4 className="text-sm font-bold">{report.status === 'buyer_confirmed' ? 'You confirmed receiving this refund' : report.status === 'disputed' ? 'Refund problem reported to support' : 'Refund reported as sent'}</h4>
    <p className="break-words text-xs">Reference: {report.payment_reference}</p><p className="whitespace-pre-wrap break-words text-xs">{report.note}</p>
    <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">This is a manual payment report, not confirmation from the payment provider. Check your payment account for the full agreed amount before confirming receipt.</p>
    {report.decision_note && <p className="whitespace-pre-wrap break-words text-xs">Your response: {report.decision_note}</p>}
    {report.status === 'reported' && (!action ? <div className="flex flex-wrap gap-2"><Button className="h-9" onClick={() => {setAction('buyer_confirmed'); setNote('')}}>I received the refund</Button><Button className="h-9" variant="outline" onClick={() => {setAction('disputed'); setNote('')}}>Report a refund problem</Button></div> : <form onSubmit={submit} className="space-y-2">
      <label className="block text-xs font-semibold">{action === 'buyer_confirmed' ? 'Confirm you checked and received the agreed amount' : 'Describe the refund problem'}<textarea required minLength={10} maxLength={1000} rows={2} value={note} disabled={busy} onChange={event => setNote(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-[16px] font-normal text-slate-950 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-100" /></label>
      <p className="text-xs text-slate-600 dark:text-slate-300">No PINs, passwords, phone or bank account numbers. Support can review a problem without you confirming receipt.</p>
      <div className="flex flex-wrap gap-2"><Button className="h-9" type="submit" disabled={busy || note.trim().length < 10}>{busy ? 'Saving…' : 'Save receipt response'}</Button><Button className="h-9" variant="outline" type="button" disabled={busy} onClick={() => setAction(null)}>Back</Button></div>
    </form>)}
    {error && <p role="alert" className="text-xs text-red-700 dark:text-red-300">{error}</p>}
  </div>
}
