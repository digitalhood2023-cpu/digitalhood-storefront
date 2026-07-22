import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle2,
  Mail,
  PackageSearch,
  Search,
  Send,
} from 'lucide-react'

import Header from '@/sections/Header'
import Footer from '@/sections/Footer'

import SEO from '@/components/SEO'
import {
  createSupportCase,
  lookupSupportCase,
  type PublicSupportCase,
  type SupportCaseType,
} from '@/api/support'

type SupportMode = 'create' | 'track'

type SupportCaseField = {
  name: string
  label: string
  placeholder?: string
  required?: boolean
  textarea?: boolean
  type?: string
}

type SupportCaseFormConfig = {
  subjectPlaceholder: string
  messageLabel: string
  messagePlaceholder: string
  fields: SupportCaseField[]
}

const TURNSTILE_SITE_KEY = '0x4AAAAAAD7MdYiDnBbCljKc'
const TURNSTILE_SCRIPT_URL =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string
      action: string
      callback: (token: string) => void
      'expired-callback': () => void
      'error-callback': () => void
    }
  ) => string
  reset: (widgetId?: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let turnstileScriptPromise: Promise<void> | null = null

function loadTurnstileScript() {
  if (window.turnstile) {
    return Promise.resolve()
  }

  if (turnstileScriptPromise) {
    return turnstileScriptPromise
  }

  turnstileScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${TURNSTILE_SCRIPT_URL}"]`
    )

    const resolveWhenReady = () => {
      if (window.turnstile) {
        resolve()
      } else {
        reject(new Error('Cloudflare Turnstile did not initialize.'))
      }
    }

    if (existingScript) {
      existingScript.addEventListener('load', resolveWhenReady, { once: true })
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Unable to load Cloudflare Turnstile.')),
        { once: true }
      )
      return
    }

    const script = document.createElement('script')
    script.src = TURNSTILE_SCRIPT_URL
    script.async = true
    script.defer = true
    script.onload = resolveWhenReady
    script.onerror = () =>
      reject(new Error('Unable to load Cloudflare Turnstile.'))

    document.head.appendChild(script)
  })

  return turnstileScriptPromise
}

function TurnstileWidget({
  onTokenChange,
  resetKey,
}: {
  onTokenChange: (token: string) => void
  resetKey: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)

  useEffect(() => {
    let active = true

    loadTurnstileScript()
      .then(() => {
        if (!active || !containerRef.current || !window.turnstile) {
          return
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          action: 'turnstile-spin-v2',
          callback: (token) => onTokenChange(token),
          'expired-callback': () => onTokenChange(''),
          'error-callback': () => onTokenChange(''),
        })
      })
      .catch(() => onTokenChange(''))

    return () => {
      active = false

      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [onTokenChange])

  useEffect(() => {
    if (resetKey > 0 && widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current)
      onTokenChange('')
    }
  }, [onTokenChange, resetKey])

  return (
    <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
      <p className="mb-3 text-xs font-black text-[#26248c]">
        Human verification
      </p>

      <div
        ref={containerRef}
        className="cf-turnstile"
        data-sitekey={TURNSTILE_SITE_KEY}
        data-action="turnstile-spin-v2"
      />
    </div>
  )
}

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

const supportCaseFormConfigs: Partial<Record<SupportCaseType, SupportCaseFormConfig>> = {
  GENERAL_CONTACT: {
    subjectPlaceholder: 'What do you need help with?',
    messageLabel: 'Message',
    messagePlaceholder: 'Explain your question or request clearly.',
    fields: [
      { name: 'contactReason', label: 'Reason for contacting us', placeholder: 'Business inquiry, general question, partnership, other' },
      { name: 'preferredContactMethod', label: 'Preferred contact method', placeholder: 'Email, phone call or WhatsApp' },
    ],
  },
  ORDER_SUPPORT: {
    subjectPlaceholder: 'What is the order issue?',
    messageLabel: 'Order issue details',
    messagePlaceholder: 'Explain what happened with this order.',
    fields: [
      { name: 'issueReason', label: 'Order issue reason', required: true, placeholder: 'Wrong item, missing item, damaged item, order status, other' },
      { name: 'affectedItem', label: 'Affected item', placeholder: 'Product name or item in the order' },
    ],
  },
  PAYMENT_SUPPORT: {
    subjectPlaceholder: 'What payment issue happened?',
    messageLabel: 'Payment issue details',
    messagePlaceholder: 'Explain the payment issue and include any useful reference.',
    fields: [
      { name: 'paymentMethod', label: 'Payment method', required: true, placeholder: 'MTN, Airtel, Zamtel, card, bank transfer' },
      { name: 'paymentReference', label: 'Payment or transaction reference', placeholder: 'Transaction ID, mobile money reference or card reference' },
      { name: 'paymentAmount', label: 'Amount paid', placeholder: 'Example: K1,250' },
      { name: 'paymentDate', label: 'Payment date', type: 'date' },
    ],
  },
  DELIVERY_SUPPORT: {
    subjectPlaceholder: 'What delivery issue happened?',
    messageLabel: 'Delivery issue details',
    messagePlaceholder: 'Explain the delivery issue, address concern or pickup issue.',
    fields: [
      { name: 'deliveryIssue', label: 'Delivery issue', required: true, placeholder: 'Late delivery, wrong address, pickup issue, rider issue' },
      { name: 'deliveryCity', label: 'Delivery city/town', placeholder: 'Example: Lusaka' },
      { name: 'deliveryAddress', label: 'Delivery address', placeholder: 'Address related to the delivery issue' },
    ],
  },
  RETURN_REFUND: {
    subjectPlaceholder: 'What return or refund do you need?',
    messageLabel: 'Return/refund details',
    messagePlaceholder: 'Explain why you want a return or refund and what resolution you prefer.',
    fields: [
      { name: 'affectedItem', label: 'Item to return/refund', required: true, placeholder: 'Product name' },
      { name: 'returnReason', label: 'Reason', required: true, placeholder: 'Damaged, wrong item, not as described, changed mind' },
      { name: 'preferredResolution', label: 'Preferred resolution', placeholder: 'Refund, replacement, exchange, repair' },
    ],
  },
  WARRANTY_CLAIM: {
    subjectPlaceholder: 'What warranty issue do you have?',
    messageLabel: 'Warranty issue details',
    messagePlaceholder: 'Explain the fault, when it started, and how the product is behaving.',
    fields: [
      { name: 'productName', label: 'Product name/model', required: true, placeholder: 'Example: HP EliteBook 840 G5' },
      { name: 'faultDescription', label: 'Fault description', required: true, textarea: true, placeholder: 'Describe the fault clearly' },
      { name: 'purchaseDate', label: 'Purchase date if known', type: 'date' },
      { name: 'serialNumber', label: 'Serial number if available', placeholder: 'Optional' },
    ],
  },
  SELLER_SUPPORT: {
    subjectPlaceholder: 'What seller issue do you need help with?',
    messageLabel: 'Seller support details',
    messagePlaceholder: 'Explain the seller account, store or listing issue.',
    fields: [
      { name: 'storeName', label: 'Store name', placeholder: 'Your DigitalHood store name' },
      { name: 'sellerEmail', label: 'Seller email', type: 'email', placeholder: 'seller@example.com' },
      { name: 'sellerIssueArea', label: 'Issue area', required: true, placeholder: 'Login, products, orders, payout, store settings' },
    ],
  },
  PRODUCT_INQUIRY: {
    subjectPlaceholder: 'What product are you asking about?',
    messageLabel: 'Product question',
    messagePlaceholder: 'Ask your product question clearly.',
    fields: [
      { name: 'productName', label: 'Product name/link', required: true, placeholder: 'Product name or DigitalHood product link' },
      { name: 'quantityNeeded', label: 'Quantity needed', placeholder: 'Example: 1, 5, 20' },
      { name: 'buyingTimeline', label: 'Buying timeline', placeholder: 'Today, this week, next month' },
    ],
  },
  QUOTE_REQUEST: {
    subjectPlaceholder: 'Quotation request title',
    messageLabel: 'Quotation details',
    messagePlaceholder: 'List the items/specifications needed. Include brands, quantities and delivery requirements.',
    fields: [
      { name: 'organizationName', label: 'Company/school/organization name', required: true, placeholder: 'Organization name' },
      { name: 'contactPerson', label: 'Contact person', required: true, placeholder: 'Name of procurement/contact person' },
      { name: 'itemsNeeded', label: 'Items needed', required: true, textarea: true, placeholder: 'Example: 10 laptops, Core i5, 8GB RAM, 256GB SSD' },
      { name: 'deliveryLocation', label: 'Delivery location', placeholder: 'Town/city or full delivery location' },
      { name: 'quotationDeadline', label: 'Quotation deadline', type: 'date' },
    ],
  },
  TECHNICAL_ISSUE: {
    subjectPlaceholder: 'What technical issue happened?',
    messageLabel: 'Technical issue details',
    messagePlaceholder: 'Explain what you were trying to do, what happened, and any error message shown.',
    fields: [
      { name: 'pageUrl', label: 'Page or URL with the issue', placeholder: 'Example: checkout page, product page, account page' },
      { name: 'deviceBrowser', label: 'Device/browser', placeholder: 'Example: iPhone Safari, Android Chrome, Windows Chrome' },
      { name: 'technicalIssueType', label: 'Issue type', required: true, placeholder: 'Checkout error, login issue, page not loading, payment form issue' },
      { name: 'stepsTaken', label: 'Steps taken before the issue', textarea: true, placeholder: 'Tell us what you clicked or entered before the issue happened' },
    ],
  },
  BUSINESS_INQUIRY: {
    subjectPlaceholder: 'Business inquiry title',
    messageLabel: 'Business inquiry details',
    messagePlaceholder: 'Explain the partnership, company request or business inquiry.',
    fields: [
      { name: 'companyName', label: 'Company name', placeholder: 'Company or organization name' },
      { name: 'inquiryType', label: 'Inquiry type', placeholder: 'Partnership, supply, corporate account, tender, other' },
    ],
  },
  FRAUD_REPORT: {
    subjectPlaceholder: 'Fraud or safety report title',
    messageLabel: 'Report details',
    messagePlaceholder: 'Explain what happened and include any evidence or related order/product details.',
    fields: [
      { name: 'reportType', label: 'Report type', required: true, placeholder: 'Suspicious seller, fake product, payment fraud, impersonation' },
      { name: 'relatedOrderOrProduct', label: 'Related order/product/seller', placeholder: 'Order number, product link or seller name' },
    ],
  },
}

const defaultSupportFormConfig: SupportCaseFormConfig = {
  subjectPlaceholder: 'What do you need help with?',
  messageLabel: 'Message',
  messagePlaceholder: 'Explain the issue clearly. Include payment/order details if relevant.',
  fields: [],
}

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
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState<SupportMode>(() => {
    return location.pathname.includes('/track') || searchParams.get('mode') === 'track'
      ? 'track'
      : 'create'
  })
  const [startedAt] = useState(Date.now())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLookingUp, setIsLookingUp] = useState(false)
  const [error, setError] = useState('')
  const [successCaseNumber, setSuccessCaseNumber] = useState('')
  const [lookedUpCase, setLookedUpCase] = useState<PublicSupportCase | null>(null)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileResetKey, setTurnstileResetKey] = useState(0)

  const [form, setForm] = useState({
    type: 'GENERAL_CONTACT' as SupportCaseType,
    name: '',
    email: '',
    phone: '',
    orderNumber: '',
    subject: '',
    message: '',
    companyWebsite: '',
    caseDetails: {} as Record<string, string>,
  })

  const [trackForm, setTrackForm] = useState({
    caseNumber: '',
    email: '',
  })

  useEffect(() => {
    const typeParam = searchParams.get('type') as SupportCaseType | null
    const orderNumberParam = searchParams.get('orderNumber') || ''
    const subjectParam = searchParams.get('subject') || ''
    const messageParam = searchParams.get('message') || ''
    const caseNumberParam = searchParams.get('caseNumber') || ''
    const emailParam = searchParams.get('email') || ''
    const modeParam = searchParams.get('mode') as SupportMode | null

    const validType = typeParam && supportTypes.some((item) => item.value === typeParam)

    if (location.pathname.includes('/track') || modeParam === 'track' || caseNumberParam) {
      setMode('track')
    } else if (modeParam === 'create' || validType || orderNumberParam || subjectParam || messageParam) {
      setMode('create')
    }

    if (validType || orderNumberParam || subjectParam || messageParam) {
      setForm((current) => ({
        ...current,
        type: validType ? typeParam : current.type,
        orderNumber: orderNumberParam || current.orderNumber,
        subject: subjectParam || current.subject,
        message: messageParam || current.message,
      }))
    }

    if (caseNumberParam || emailParam) {
      setTrackForm((current) => ({
        ...current,
        caseNumber: caseNumberParam || current.caseNumber,
        email: emailParam || current.email,
      }))
    }
  }, [location.pathname, searchParams])

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

  const selectedFormConfig = useMemo(() => {
    return supportCaseFormConfigs[form.type] || defaultSupportFormConfig
  }, [form.type])

  function updateCaseDetail(name: string, value: string) {
    setForm((current) => ({
      ...current,
      caseDetails: {
        ...current.caseDetails,
        [name]: value,
      },
    }))
  }

  async function handleCreateCase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccessCaseNumber('')
    setLookedUpCase(null)

    if (!turnstileToken) {
      setError('Please complete the human verification before submitting.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await createSupportCase({
        ...form,
        'cf-turnstile-response': turnstileToken,
        startedAt,
        pageUrl: window.location.href,
      })

      setSuccessCaseNumber(response.caseNumber)
      setTurnstileToken('')
      setTurnstileResetKey((current) => current + 1)
      setMode('track')
      setForm((current) => ({
        ...current,
        subject: '',
        message: '',
        orderNumber: '',
        companyWebsite: '',
        caseDetails: {},
      }))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to create support case.')
      setTurnstileToken('')
      setTurnstileResetKey((current) => current + 1)
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
    <>
      <Header />

      <main className="min-h-screen bg-gradient-to-b from-[#f7f8ff] via-white to-[#fff7ec]/50">
      <SEO
        title="DigitalHood Support Cases Zambia | DigitalHood"
        description="Create and track DigitalHood support cases for orders, payments, delivery, warranty, returns and seller support in Zambia."
      />


      <section className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
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
                    onClick={() => setForm((current) => ({ ...current, type: type.value, caseDetails: {} }))}
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
                    placeholder={['ORDER_SUPPORT', 'PAYMENT_SUPPORT', 'DELIVERY_SUPPORT', 'RETURN_REFUND', 'WARRANTY_CLAIM'].includes(form.type) ? 'Required for this case type' : 'Optional'}
                    required={['ORDER_SUPPORT', 'PAYMENT_SUPPORT', 'DELIVERY_SUPPORT', 'RETURN_REFUND', 'WARRANTY_CLAIM'].includes(form.type)}
                  />
                </label>
              </div>

              {selectedFormConfig.fields.length > 0 && (
                <div className="grid gap-3 md:grid-cols-2">
                  {selectedFormConfig.fields.map((field) => (
                    <label
                      key={field.name}
                      className={field.textarea ? 'grid gap-1 md:col-span-2' : 'grid gap-1'}
                    >
                      <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                        {field.label}
                      </span>

                      {field.textarea ? (
                        <textarea
                          required={field.required}
                          rows={4}
                          value={form.caseDetails[field.name] || ''}
                          onChange={(event) => updateCaseDetail(field.name, event.target.value)}
                          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold leading-6 outline-none focus:border-[#26248c]"
                          placeholder={field.placeholder}
                        />
                      ) : (
                        <input
                          required={field.required}
                          type={field.type || 'text'}
                          value={form.caseDetails[field.name] || ''}
                          onChange={(event) => updateCaseDetail(field.name, event.target.value)}
                          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#26248c]"
                          placeholder={field.placeholder}
                        />
                      )}
                    </label>
                  ))}
                </div>
              )}

              <label className="grid gap-1">
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">Subject</span>
                <input
                  required
                  value={form.subject}
                  onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold outline-none focus:border-[#26248c]"
                  placeholder={selectedFormConfig.subjectPlaceholder}
                />
              </label>

              <label className="grid gap-1">
                <span className="text-xs font-black uppercase tracking-wide text-slate-500">{selectedFormConfig.messageLabel}</span>
                <textarea
                  required
                  rows={7}
                  value={form.message}
                  onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                  className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold leading-6 outline-none focus:border-[#26248c]"
                  placeholder={selectedFormConfig.messagePlaceholder}
                />
              </label>

              <TurnstileWidget
                onTokenChange={setTurnstileToken}
                resetKey={turnstileResetKey}
              />

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

      <Footer />
    </>
  )
}
