import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileImage,
  FileVideo,
  LifeBuoy,
  Loader2,
  MessageCircle,
  PackageCheck,
  Paperclip,
  Send,
  ShieldCheck,
  ShoppingBag,
  X,
} from 'lucide-react'

import {
  createCustomerOrderCase,
  getCustomerOrder,
  getCustomerOrderCases,
  replyToCustomerOrderCase,
  type AccountOrder,
  type AccountOrderCase,
  type AccountOrderCaseAttachment,
  type AccountOrderCaseReasonOption,
} from '@/api/account'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAccount } from '@/context/AccountContext'
import { formatOrderDate, formatOrderMoney } from '@/lib/orderTracking'
import Header from '@/sections/Header'
import Footer from '@/sections/Footer'

const SUPPORT_ASSET_ORIGIN =
  import.meta.env.VITE_PAYMENTS_API_URL || 'https://payments.digitalhood.info'
const MAX_EVIDENCE_FILES = 5
const MAX_VIDEO_BYTES = 15 * 1024 * 1024
const MAX_IMAGE_INPUT_BYTES = 8 * 1024 * 1024
const MAX_DESCRIPTION_WORDS = 200

type EvidenceFile = {
  file: File
  previewUrl: string
  kind: 'image' | 'video'
}

function formatBytes(value = 0) {
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function countWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0
}

function normalizeCaseStatus(value?: string) {
  return String(value || 'NEW').trim().toUpperCase().replaceAll('-', '_').replaceAll(' ', '_')
}

function caseStatusLabel(value?: string) {
  const status = normalizeCaseStatus(value)
  if (status === 'NEW') return 'Received'
  if (status === 'OPEN' || status === 'IN_PROGRESS') return 'In review'
  if (status === 'PENDING' || status === 'WAITING_FOR_SELLER') return 'Being handled'
  if (status === 'WAITING_FOR_CUSTOMER') return 'Needs your reply'
  if (status === 'RESOLVED' || status === 'DONE') return 'Resolved'
  if (status === 'CLOSED') return 'Closed'
  return status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function caseStatusStyle(value?: string) {
  const status = normalizeCaseStatus(value)
  if (status === 'WAITING_FOR_CUSTOMER') return 'bg-orange-50 text-orange-700 ring-orange-200'
  if (['RESOLVED', 'DONE'].includes(status)) return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (status === 'CLOSED') return 'bg-slate-100 text-slate-600 ring-slate-200'
  return 'bg-blue-50 text-blue-700 ring-blue-200'
}

function attachmentUrl(attachment: AccountOrderCaseAttachment) {
  const value = String(attachment.url || '').trim()
  if (!value) return ''
  try {
    return new URL(value, SUPPORT_ASSET_ORIGIN).toString()
  } catch {
    return value
  }
}

function isVideoAttachment(attachment: AccountOrderCaseAttachment) {
  return attachment.type === 'video' || String(attachment.mimeType || '').startsWith('video/')
}

async function compressEvidenceImage(file: File) {
  if (!file.type.startsWith('image/')) return file
  if (file.size > MAX_IMAGE_INPUT_BYTES) {
    throw new Error(`${file.name} is larger than 8 MB.`)
  }

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const context = canvas.getContext('2d')

  if (!context) {
    bitmap.close()
    return file
  }

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/webp', 0.82)
  })

  if (!blob || blob.size >= file.size) return file

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'evidence'
  return new File([blob], `${baseName}.webp`, {
    type: 'image/webp',
    lastModified: file.lastModified,
  })
}

function EvidencePicker({
  files,
  onChange,
  disabled = false,
}: {
  files: EvidenceFile[]
  onChange: (files: EvidenceFile[]) => void
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [preparing, setPreparing] = useState(false)

  async function selectFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || [])
    event.target.value = ''
    setError('')

    if (files.length + selected.length > MAX_EVIDENCE_FILES) {
      setError(`Add up to ${MAX_EVIDENCE_FILES} files per report.`)
      return
    }

    const existingVideoCount = files.filter((item) => item.kind === 'video').length
    const nextVideoCount = selected.filter((file) => file.type.startsWith('video/')).length
    if (existingVideoCount + nextVideoCount > 1) {
      setError('Add one short video at most. You can also add photos.')
      return
    }

    setPreparing(true)
    try {
      const prepared: EvidenceFile[] = []
      for (const selectedFile of selected) {
        const kind = selectedFile.type.startsWith('video/') ? 'video' : 'image'
        if (kind === 'video' && selectedFile.size > MAX_VIDEO_BYTES) {
          throw new Error(`${selectedFile.name} is larger than 15 MB.`)
        }

        const file = kind === 'image' ? await compressEvidenceImage(selectedFile) : selectedFile
        prepared.push({ file, kind, previewUrl: URL.createObjectURL(file) })
      }
      onChange([...files, ...prepared])
    } catch (selectionError) {
      setError(selectionError instanceof Error ? selectionError.message : 'Unable to prepare that evidence.')
    } finally {
      setPreparing(false)
    }
  }

  function removeFile(index: number) {
    URL.revokeObjectURL(files[index].previewUrl)
    onChange(files.filter((_, itemIndex) => itemIndex !== index))
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
        multiple
        className="hidden"
        onChange={(event) => void selectFiles(event)}
      />

      {!!files.length && (
        <div className="mb-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {files.map((item, index) => (
            <div key={`${item.file.name}-${item.file.lastModified}`} className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              {item.kind === 'video' ? (
                <video src={item.previewUrl} className="aspect-square w-full object-cover" muted playsInline />
              ) : (
                <img src={item.previewUrl} alt="Selected evidence" className="aspect-square w-full object-cover" />
              )}
              <button type="button" onClick={() => removeFile(index)} aria-label={`Remove ${item.file.name}`} className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"><X className="h-3 w-3" /></button>
              <span className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1.5 py-1 text-[9px] font-bold text-white">{formatBytes(item.file.size)}</span>
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        disabled={disabled || preparing || files.length >= MAX_EVIDENCE_FILES}
        onClick={() => inputRef.current?.click()}
        className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 text-xs font-bold text-slate-600 hover:border-dh-primary hover:text-dh-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        {preparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        {preparing ? 'Optimising evidence…' : files.length ? `Add more (${files.length}/${MAX_EVIDENCE_FILES})` : 'Add photos or one short video (optional)'}
      </button>
      {error && <p className="mt-1.5 text-xs font-semibold text-red-600">{error}</p>}
      <p className="mt-1.5 text-[10px] leading-4 text-slate-500">Photos are compressed for faster upload. Up to five files, including one video up to 15 MB.</p>
    </div>
  )
}

function StoredEvidence({ attachments = [] }: { attachments?: AccountOrderCaseAttachment[] }) {
  if (!attachments.length) return null
  return (
    <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
      {attachments.map((attachment, index) => {
        const url = attachmentUrl(attachment)
        return (
          <a key={attachment.id || attachment.filename || index} href={url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
            {isVideoAttachment(attachment) ? (
              <video src={url} className="aspect-square w-full object-cover" muted playsInline />
            ) : (
              <img src={url} alt={attachment.originalName || `Evidence ${index + 1}`} loading="lazy" className="aspect-square w-full object-cover" />
            )}
          </a>
        )
      })}
    </div>
  )
}

export default function AccountOrderIssuePage() {
  const { orderId = '' } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, isLoading: accountLoading } = useAccount()
  const [order, setOrder] = useState<AccountOrder | null>(null)
  const [existingCase, setExistingCase] = useState<AccountOrderCase | null>(null)
  const [reasonOptions, setReasonOptions] = useState<AccountOrderCaseReasonOption[]>([])
  const [canCreateCase, setCanCreateCase] = useState(false)
  const [eligibilityMessage, setEligibilityMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reason, setReason] = useState('')
  const [itemId, setItemId] = useState('')
  const [description, setDescription] = useState('')
  const [evidence, setEvidence] = useState<EvidenceFile[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [reply, setReply] = useState('')
  const [replyEvidence, setReplyEvidence] = useState<EvidenceFile[]>([])
  const [replying, setReplying] = useState(false)
  const evidenceRef = useRef(evidence)
  const replyEvidenceRef = useRef(replyEvidence)
  const wordCount = countWords(description)

  evidenceRef.current = evidence
  replyEvidenceRef.current = replyEvidence

  useEffect(() => {
    if (!accountLoading && !isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(`/account/orders/${orderId}/report`)}`)
    }
  }, [accountLoading, isAuthenticated, navigate, orderId])

  useEffect(() => () => {
    evidenceRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl))
    replyEvidenceRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl))
  }, [])

  const loadCase = useCallback(async (silent = false) => {
    if (!orderId || !isAuthenticated) return
    if (!silent) setLoading(true)
    if (!silent) setError('')
    try {
      const [orderResponse, caseResponse] = await Promise.all([
        getCustomerOrder(orderId),
        getCustomerOrderCases(orderId),
      ])
      setOrder(orderResponse.order)
      setExistingCase(caseResponse.existingCase || caseResponse.cases?.[0] || null)
      setReasonOptions(caseResponse.reasonOptions || [])
      setCanCreateCase(Boolean(caseResponse.canCreateCase))
      setEligibilityMessage(caseResponse.eligibility?.reason || '')
      setReason((current) => current || caseResponse.reasonOptions?.[0]?.value || '')
    } catch (requestError) {
      if (!silent) setError(requestError instanceof Error ? requestError.message : 'Unable to load order support.')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [isAuthenticated, orderId])

  useEffect(() => {
    if (!isAuthenticated) return
    void loadCase()
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadCase(true)
    }, 30_000)
    return () => window.clearInterval(timer)
  }, [isAuthenticated, loadCase])

  async function submitCase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    if (!reason) return setError('Select the issue you need help with.')
    if (description.trim().length < 10) return setError('Please describe the issue in a little more detail.')
    if (wordCount > MAX_DESCRIPTION_WORDS) return setError(`Keep the description under ${MAX_DESCRIPTION_WORDS} words.`)
    setSubmitting(true)
    try {
      const response = await createCustomerOrderCase(orderId, {
        reason,
        description: description.trim(),
        itemId: itemId || undefined,
        evidence: evidence.map((item) => item.file),
        pageUrl: window.location.href,
      })
      evidence.forEach((item) => URL.revokeObjectURL(item.previewUrl))
      setEvidence([])
      setDescription('')
      setExistingCase(response.case)
      setCanCreateCase(false)
      await loadCase(true)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to submit the report.')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!existingCase || !reply.trim()) return
    setReplying(true)
    setError('')
    try {
      const response = await replyToCustomerOrderCase(existingCase.caseNumber, {
        message: reply.trim(),
        evidence: replyEvidence.map((item) => item.file),
      })
      replyEvidence.forEach((item) => URL.revokeObjectURL(item.previewUrl))
      setReplyEvidence([])
      setReply('')
      setExistingCase(response.case)
      await loadCase(true)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to send your reply.')
    } finally {
      setReplying(false)
    }
  }

  const firstItem = order?.items?.[0]
  const extraItems = Math.max(0, (order?.items?.length || 0) - 1)
  const selectedReasonLabel = useMemo(
    () => reasonOptions.find((option) => option.value === reason)?.label || existingCase?.reasonLabel || 'Order issue',
    [existingCase?.reasonLabel, reason, reasonOptions]
  )

  if (accountLoading || (!isAuthenticated && !accountLoading)) {
    return <div className="flex min-h-[100svh] flex-col bg-dh-gray"><Header /><main className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-dh-primary" /></main><Footer /></div>
  }

  return (
    <div className="flex min-h-[100svh] flex-col bg-dh-gray">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-4 sm:px-5 sm:py-6">
        <nav className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
          <Link to="/orders" className="hover:text-dh-primary">Orders</Link><ChevronRight className="h-3.5 w-3.5" /><Link to={`/track-order/${orderId}`} className="hover:text-dh-primary">Order #{order?.number || orderId}</Link><ChevronRight className="h-3.5 w-3.5" /><span className="text-dh-primary">Report issue</span>
        </nav>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-dh-primary text-white"><LifeBuoy className="h-4 w-4" /></span><div><h1 className="font-display text-xl font-black text-dh-primary sm:text-2xl">Order support</h1><p className="text-xs text-slate-500">A private case linked to your account and order.</p></div></div>
          <Link to="/account/support-cases" className="hidden h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-dh-primary sm:inline-flex">My cases</Link>
        </div>

        {loading ? (
          <div className="mt-4 flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white"><Loader2 className="h-7 w-7 animate-spin text-dh-primary" /></div>
        ) : error && !order ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-6 text-center"><AlertCircle className="mx-auto h-7 w-7 text-red-600" /><p className="mt-2 text-sm font-bold text-red-700">{error}</p><Button type="button" onClick={() => void loadCase()} className="mt-4 bg-dh-primary text-white">Try again</Button></div>
        ) : order ? (
          <>
            <section className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              {firstItem?.image ? <img src={firstItem.image} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-slate-100 object-cover" /> : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-100"><ShoppingBag className="h-5 w-5 text-slate-400" /></span>}
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-1"><p className="text-sm font-black text-dh-primary">Order #{order.number || order.id}</p><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">{order.statusLabel || order.status}</span></div><p className="mt-0.5 truncate text-sm font-semibold text-slate-700">{firstItem?.name || 'Marketplace order'}{extraItems ? ` +${extraItems} more` : ''}</p><p className="mt-1 text-[11px] text-slate-500">{formatOrderDate(order.dateCreated)} · <span className="font-bold text-slate-700">{formatOrderMoney(order.total, order.currency)}</span></p></div>
              <Link to={`/track-order/${order.id}`} className="hidden h-9 shrink-0 items-center rounded-lg border border-slate-200 px-3 text-xs font-bold text-dh-primary sm:inline-flex">View order</Link>
            </section>

            {error && <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

            {existingCase ? (
              <div className="mt-4 grid gap-4 lg:grid-cols-[0.72fr_1.28fr]">
                <aside className="space-y-3">
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.13em] text-dh-secondary">{existingCase.caseNumber}</p><h2 className="mt-1 text-base font-black text-dh-primary">{existingCase.subject || selectedReasonLabel}</h2></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ring-1 ${caseStatusStyle(existingCase.status)}`}>{caseStatusLabel(existingCase.status)}</span></div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{existingCase.message}</p>
                    <StoredEvidence attachments={existingCase.attachments} />
                    <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500"><Clock3 className="h-3.5 w-3.5" />Opened {formatOrderDate(existingCase.createdAt, true)}</div>
                  </section>
                  <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs leading-5 text-emerald-800"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />This case is attached to your account, order and customer profile for secure follow-up.</div>
                </aside>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 font-black text-dh-primary"><MessageCircle className="h-4 w-4 text-dh-secondary" />Case updates</h2><Link to={`/account/support-cases?case=${encodeURIComponent(existingCase.caseNumber)}`} className="text-xs font-bold text-dh-primary underline">Open in My cases</Link></div>
                  <div className="mt-3 max-h-[30rem] space-y-2 overflow-y-auto pr-1">
                    {(existingCase.messages || []).map((message, index) => {
                      const fromCustomer = String(message.direction || message.senderType || message.role || '').toLowerCase().match(/customer|inbound/)
                      return <article key={message.id || index} className={`rounded-xl p-3 ${fromCustomer ? 'ml-5 bg-indigo-50' : 'mr-5 bg-slate-100'}`}><div className="flex justify-between gap-2"><p className="text-xs font-black text-dh-primary">{fromCustomer ? 'You' : String(message.authorName || message.author || 'DigitalHood Support')}</p><p className="text-[10px] text-slate-500">{formatOrderDate(message.createdAt, true)}</p></div><p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-slate-700">{message.message}</p><StoredEvidence attachments={message.attachments} /></article>
                    })}
                    {!existingCase.messages?.length && <div className="rounded-xl bg-slate-50 p-6 text-center"><PackageCheck className="mx-auto h-6 w-6 text-dh-primary" /><p className="mt-2 text-sm font-bold text-dh-primary">Report received</p><p className="mt-1 text-xs text-slate-500">Support updates will appear here automatically.</p></div>}
                  </div>

                  {existingCase.canReply && !['RESOLVED', 'CLOSED'].includes(normalizeCaseStatus(existingCase.status)) && (
                    <form onSubmit={submitReply} className="mt-3 border-t border-slate-100 pt-3">
                      <Textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Reply to DigitalHood Support" maxLength={1500} className="min-h-20 rounded-xl border-slate-200 text-sm" />
                      <div className="mt-2"><EvidencePicker files={replyEvidence} onChange={setReplyEvidence} disabled={replying} /></div>
                      <Button type="submit" disabled={replying || !reply.trim()} className="mt-2 h-10 w-full rounded-xl bg-dh-primary text-xs font-black text-white"><Send className="mr-2 h-4 w-4" />{replying ? 'Sending…' : 'Send reply'}</Button>
                    </form>
                  )}
                  {['RESOLVED', 'CLOSED'].includes(normalizeCaseStatus(existingCase.status)) && <div className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />This case is {caseStatusLabel(existingCase.status).toLowerCase()} and remains in your records.</div>}
                </section>
              </div>
            ) : canCreateCase ? (
              <form onSubmit={submitCase} className="mt-4 grid gap-4 lg:grid-cols-[0.72fr_1.28fr]">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-dh-secondary">1 · Choose the issue</p>
                  <div className="mt-2 space-y-1.5">
                    {reasonOptions.map((option) => <button key={option.value} type="button" onClick={() => setReason(option.value)} className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs font-bold ${reason === option.value ? 'border-dh-primary bg-indigo-50 text-dh-primary' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}><span>{option.label}</span>{reason === option.value && <CheckCircle2 className="h-4 w-4" />}</button>)}
                  </div>
                  {(order.items?.length || 0) > 1 && <div className="mt-3"><label htmlFor="case-item" className="text-[10px] font-black uppercase tracking-wide text-slate-500">Related item (optional)</label><select id="case-item" value={itemId} onChange={(event) => setItemId(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700"><option value="">Whole order</option>{order.items?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-dh-secondary">2 · Tell us what happened</p>
                  <h2 className="mt-1 text-base font-black text-dh-primary">{selectedReasonLabel}</h2>
                  <Textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe what happened, what you expected and the help you need." className="mt-3 min-h-32 rounded-xl border-slate-200 text-sm leading-6" />
                  <div className="mt-1 flex justify-between text-[10px] font-semibold"><span className="text-slate-500">Include useful dates or delivery details.</span><span className={wordCount > MAX_DESCRIPTION_WORDS ? 'text-red-600' : 'text-slate-500'}>{wordCount}/{MAX_DESCRIPTION_WORDS} words</span></div>
                  <div className="mt-3"><p className="mb-1.5 flex items-center gap-1.5 text-xs font-black text-dh-primary"><FileImage className="h-4 w-4" /><FileVideo className="h-4 w-4" />Evidence</p><EvidencePicker files={evidence} onChange={setEvidence} disabled={submitting} /></div>
                  <Button type="submit" disabled={submitting || !reason || description.trim().length < 10 || wordCount > MAX_DESCRIPTION_WORDS} className="mt-3 h-11 w-full rounded-xl bg-dh-primary text-xs font-black text-white"><Send className="mr-2 h-4 w-4" />{submitting ? 'Creating secure case…' : 'Submit report'}</Button>
                  <p className="mt-2 text-center text-[10px] leading-4 text-slate-500">You will receive updates here and by email. Your evidence is only shared with authorised support staff.</p>
                </section>
              </form>
            ) : (
              <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-7 text-center"><PackageCheck className="mx-auto h-8 w-8 text-dh-primary" /><h2 className="mt-2 text-lg font-black text-dh-primary">A report cannot be opened for this order</h2><p className="mx-auto mt-1 max-w-lg text-sm text-slate-500">{eligibilityMessage || 'This order is outside the account support window or is not eligible for a new case.'}</p><Link to={`/track-order/${order.id}`} className="mt-4 inline-flex h-10 items-center rounded-xl bg-dh-primary px-4 text-xs font-black text-white"><ArrowLeft className="mr-2 h-4 w-4" />Return to order</Link></section>
            )}
          </>
        ) : null}
      </main>
      <Footer />
    </div>
  )
}
