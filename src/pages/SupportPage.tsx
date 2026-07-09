import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  LifeBuoy,
  Mail,
  MessageSquareText,
  PackageSearch,
  Search,
  Send,
  ShieldCheck,
} from 'lucide-react'

import SEO from '@/components/SEO'
import {
  createSupportCase,
  lookupSupportCase,
  type PublicSupportCase,
  type SupportCaseType,
} from '@/api/support'

type SupportMode = 'create' | 'track'

const supportTypes: Array<{ value: SupportCaseType; label: string; helper: string }> = [
  { value: 'GENERAL_CONTACT', label: 'General contact', helper: 'Questions, business inquiries and normal support.' },
  { value: 'ORDER_SUPPORT', label: 'Order support', helper: 'Help with a DigitalHood order.' },
  { value: 'PAYMENT_SUPPORT', label: 'Payment support', helper: 'Mobile money, card payments or failed payments.' },
  { value: 'DELIVERY_SUPPORT', label: 'Delivery support', helper: 'Delivery status, pickup or address help.' },
  { value: 'RETURN_REFUND', label: 'Return or refund', helper: 'Return requests and refund follow-ups.' },
  { value: 'WARRANTY_CLAIM', label: 'Warranty claim', helper: 'Warranty support for products bought from DigitalHood.' },
  { value: 'SELLER_SUPPORT', label: 'Seller support', helper: 'Seller account, store or product listing help.' },
  { value: 'PRODUCT_INQUIRY', label: 'Product inquiry', helper: 'Questions before buying a product.' },
  { value: 'QUOTE_REQUEST', label: 'Quotation request', helper: 'Formal quotations for companies, schools and tenders.' },
  { value: 'TECHNICAL_ISSUE', label: 'Technical issue', helper: 'Website, checkout or account technical problem.' },
]

function formatDate(value?: string) {
  if (!value) return '—'

  try {
    return new Date(value).toLocaleString('en-ZM')
  } catch {
    return value
  }
}

function cleanLabel(value?: string) {
  return String(value || '')
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function statusClass(value?: string) {
  const status = String(value || 'NEW').toUpperCase()

  if (status === 'RESOLVED' || status === 'CLOSED') {
    return 'bg-green-50 text-green-700 ring-green-100'
  }

  if (status === 'OPEN') {
    return 'bg-blue-50 text-blue-700 ring-blue-100'
  }

  if (status === 'PENDING') {
    return 'bg-amber-50 text-amber-700 ring-amber-100'
  }

  return 'bg-[#fff7ec] text-[#7a4a00] ring-[#ffb54a]/30'
}

function StatusPill({ value }: { value?: string }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ring-1 ${statusClass(value)}`}>
      {cleanLabel(value || 'NEW')}
    </span>
  )
}

export default function SupportPage() {
  const [mode, setMode] = useState<SupportMode>('create')
  const [startedAt] = useState(Date.now())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [error, setError] = useState('')
  const [successCaseNumber, setSuccessCaseNumber] = useState('')
  const [lookedUpCase, setLookedUpCase] = useState<PublicSupportCase | null>(null)

  const [form, setForm] = useState({
    type: 'GENERAL_CONTACT' as SupportCaseType,
    name: '',
    email: '',
    phone: '',
    orderNumber: '',
    subject: '',
    message: '',
    companyWebsite: '',
  })

  const [trackForm, setTrackForm] = useState({
    caseNumber: '',
    email: '',
  })

  useEffect(() => {
    if (successCaseNumber) {
      setTrackForm((current) => ({
        ...current,
        caseNumber: successCaseNumber,
        email: form.email,
      }))
    }
  }, [successCaseNumber, form.email])

  const selectedType = useMemo(() => {
    return supportTypes.find((item) => item.value === form.type) || supportTypes[0]
  }, [form.type])

  async function handleCreateCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccessCaseNumber('')
    setLookedUpCase(null)
    setIsSubmitting(true)

    try {
      const response = await createSupportCase({
        ...form,
        startedAt,
        pageUrl: window.location.href,
      })

      setSuccessCaseNumber(response.caseNumber)
      setMode('track')
      setForm((current) => ({
        ...current,
        subject: '',
        message: '',
        orderNumber: '',
        companyWebsite: '',
      }))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create support case.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleLookupCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLookedUpCase(null)
    setIsLookingUp(true)

    try {
      const response = await lookupSupportCase(trackForm)
      setLookedUpCase(response.case)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to find support case.')
    } finally {
      setIsLookingUp(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f7f8ff] via-white to-[#fff7ec]/50">
      <SEO
        title="DigitalHood Support Center Zambia | Track Support Cases"
        description="Create and track DigitalHood Marketplace support cases for orders, payments, delivery, warranty, returns and seller support in Zambia."
      />

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[1fr_420px] lg:px-6 lg:py-12">
        <div className="overflow-hidden rounded-[2rem] bg-[#26248c] text-white shadow-2xl shadow-[#26248c]/15">
          <div className="p-6 md:p-8">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[#ffb54a]">
              <LifeBuoy className="h-4 w-4" />
              DigitalHood Support Center
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight md:text-5xl">
              Get help and track your support case.
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-white/72">
              Create a support case for orders, payments, delivery, warranty, returns, quotations and marketplace issues. Every request gets a case number for follow-up.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { icon: ShieldCheck, title: 'Trackable cases', text: 'Every request gets a DigitalHood case number.' },
                { icon: Clock3, title: 'Admin follow-up', text: 'Our team updates status inside the support desk.' },
                { icon: MessageSquareText, title: 'Email replies', text: 'Replies are sent to your case email address.' },
              ].map((item) => {
                const Icon = item.icon

                return (
                  <div key={item.title} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10">
                    <Icon className="h-5 w-5 text-[#ffb54a]" />
                    <p className="mt-3 text-sm font-black">{item.title}</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-white/60">{item.text}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <aside className="rounded-[2rem] bg-white p-5 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            Quick help
          </p>
          <div className="mt-4 grid gap-3">
            {[
              ['Email', 'contact@digitalhood.info'],
              ['Phone', '+260 971 047 570'],
              ['Marketplace', 'store.digitalhood.info'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{label}</p>
                <p className="mt-1 text-sm font-black text-[#26248c]">{value}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 lg:px-6">
        <div className="mb-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-black transition ${
              mode === 'create'
                ? 'bg-[#26248c] text-white'
                : 'bg-white text-[#26248c] ring-1 ring-slate-100 hover:bg-[#fff7ec]'
            }`}
          >
            <Send className="h-4 w-4" />
            Create support case
          </button>

          <button
            type="button"
            onClick={() => setMode('track')}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-black transition ${
              mode === 'track'
                ? 'bg-[#26248c] text-white'
                : 'bg-white text-[#26248c] ring-1 ring-slate-100 hover:bg-[#fff7ec]'
            }`}
          >
            <Search className="h-4 w-4" />
            Track existing case
          </button>
        </div>

        {error && (
          <p className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-100">
            {error}
          </p>
        )}

        {successCaseNumber && (
          <div className="mb-5 rounded-[1.5rem] bg-green-50 p-5 ring-1 ring-green-100">
            <p className="flex items-center gap-2 text-sm font-black text-green-800">
              <CheckCircle2 className="h-5 w-5" />
              Your support case has been created.
            </p>
            <p className="mt-2 text-2xl font-black text-[#26248c]">{successCaseNumber}</p>
            <p className="mt-1 text-sm font-semibold text-green-700">
              Keep this case number. We also sent a confirmation email if your email address was correct.
            </p>
          </div>
        )}

        {mode === 'create' ? (
          <form onSubmit={handleCreateCase} className="grid gap-6 rounded-[2rem] bg-white p-5 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100 lg:grid-cols-[360px_1fr] lg:p-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                Support type
              </p>
              <div className="mt-4 grid gap-2">
                {supportTypes.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, type: type.value }))}
                    className={`rounded-2xl p-3 text-left transition ${
                      form.type === type.value
                        ? 'bg-[#26248c] text-white'
                        : 'bg-slate-50 text-slate-700 hover:bg-[#fff7ec]'
                    }`}
                  >
                    <p className="text-sm font-black">{type.label}</p>
                    <p className={`mt-1 text-xs font-semibold leading-5 ${
                      form.type === type.value ? 'text-white/65' : 'text-slate-500'
                    }`}>
                      {type.helper}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Case form
                </p>
                <h2 className="mt-2 text-2xl font-black text-[#26248c]">
                  {selectedType.label}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {selectedType.helper}
                </p>
              </div>

              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={form.companyWebsite}
                onChange={(event) => setForm((current) => ({ ...current, companyWebsite: event.target.value }))}
                className="hidden"
              />

              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">Full name</span>
                  <input
                    required
                    value={form.name}
                    onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#26248c]"
                    placeholder="Your full name"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">Email</span>
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#26248c]"
                    placeholder="you@example.com"
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">Phone</span>
                  <input
                    value={form.phone}
                    onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#26248c]"
                    placeholder="+260..."
                  />
                </label>

                <label className="grid gap-1">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">Order number</span>
                  <input
                    value={form.orderNumber}
                    onChange={(event) => setForm((current) => ({ ...current, orderNumber: event.target.value }))}
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#26248c]"
                    placeholder="Optional"
                  />
                </label>
              </div>

              <label className="grid gap-1">
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">Subject</span>
                <input
                  required
                  value={form.subject}
                  onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#26248c]"
                  placeholder="What do you need help with?"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">Message</span>
                <textarea
                  required
                  rows={7}
                  value={form.message}
                  onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold leading-6 outline-none focus:border-[#26248c]"
                  placeholder="Explain the issue clearly. Include payment/order details if relevant."
                />
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#26248c] px-5 py-4 text-sm font-black text-white transition hover:bg-[#ffb54a] hover:text-[#26248c] disabled:opacity-60 md:w-max"
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? 'Creating case...' : 'Create support case'}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid gap-6 rounded-[2rem] bg-white p-5 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100 lg:grid-cols-[420px_1fr] lg:p-6">
            <form onSubmit={handleLookupCase} className="grid content-start gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Track case
                </p>
                <h2 className="mt-2 text-2xl font-black text-[#26248c]">
                  Check support status
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Enter your case number and the email used when creating the case.
                </p>
              </div>

              <label className="grid gap-1">
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">Case number</span>
                <input
                  required
                  value={trackForm.caseNumber}
                  onChange={(event) => setTrackForm((current) => ({ ...current, caseNumber: event.target.value }))}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold uppercase outline-none focus:border-[#26248c]"
                  placeholder="DH-CF-20260707-000006"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">Email</span>
                <input
                  required
                  type="email"
                  value={trackForm.email}
                  onChange={(event) => setTrackForm((current) => ({ ...current, email: event.target.value }))}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#26248c]"
                  placeholder="you@example.com"
                />
              </label>

              <button
                type="submit"
                disabled={isLookingUp}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#26248c] px-5 py-4 text-sm font-black text-white transition hover:bg-[#ffb54a] hover:text-[#26248c] disabled:opacity-60"
              >
                <PackageSearch className="h-4 w-4" />
                {isLookingUp ? 'Checking...' : 'Track support case'}
              </button>
            </form>

            <div className="rounded-[1.5rem] bg-slate-50 p-5">
              {lookedUpCase ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-slate-400">Case number</p>
                      <p className="mt-1 text-2xl font-black text-[#26248c]">{lookedUpCase.caseNumber}</p>
                    </div>
                    <StatusPill value={lookedUpCase.status} />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Type</p>
                      <p className="mt-1 text-sm font-black text-slate-800">{cleanLabel(lookedUpCase.type)}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Priority</p>
                      <p className="mt-1 text-sm font-black text-slate-800">{cleanLabel(lookedUpCase.priority)}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Created</p>
                      <p className="mt-1 text-sm font-black text-slate-800">{formatDate(lookedUpCase.createdAt)}</p>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Updated</p>
                      <p className="mt-1 text-sm font-black text-slate-800">{formatDate(lookedUpCase.updatedAt)}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Subject</p>
                    <p className="mt-1 text-sm font-black text-slate-800">{lookedUpCase.subject || 'Support case'}</p>
                    <p className="mt-3 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-600">
                      {lookedUpCase.message || 'No original message shown.'}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white p-4">
                    <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide text-slate-400">
                      <Mail className="h-4 w-4" />
                      DigitalHood replies
                    </p>

                    {lookedUpCase.messages?.length ? (
                      <div className="mt-3 space-y-3">
                        {lookedUpCase.messages.map((message) => (
                          <div key={message.id || message.createdAt} className="rounded-2xl bg-[#fff7ec] p-4">
                            <p className="whitespace-pre-wrap text-sm font-bold leading-6 text-[#7a4a00]">
                              {message.message}
                            </p>
                            <p className="mt-2 text-[10px] font-black uppercase tracking-wide text-[#7a4a00]/60">
                              {formatDate(message.createdAt)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
                        No replies have been posted yet. Our team will reply by email when there is an update.
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                  <AlertTriangle className="h-10 w-10 text-[#ffb54a]" />
                  <h3 className="mt-4 text-xl font-black text-[#26248c]">Case details will appear here.</h3>
                  <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-slate-500">
                    Use the case number from your confirmation email and the same email address used to create the case.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
