import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
} from 'lucide-react'
import Header from '@/sections/Header'
import Footer from '@/sections/Footer'

const PAYMENTS_API_URL =
  import.meta.env.VITE_PAYMENTS_API_URL || 'https://payments.digitalhood.info'

type SupportCaseResponse = {
  success: boolean
  caseNumber?: string
  case?: {
    caseNumber?: string
    status?: string
    priority?: string
    createdAt?: string
  }
  email?: {
    customerSent?: boolean
    adminSent?: boolean
  }
  error?: string
  details?: string
}

const contactCards = [
  {
    icon: Phone,
    title: 'Phone',
    value: '+260 971 047 570',
    helper: 'Mon-Sat, 8am-6pm',
    href: 'tel:+260971047570',
  },
  {
    icon: Mail,
    title: 'Email',
    value: 'contact@digitalhood.info',
    helper: 'We reply as soon as possible',
    href: 'mailto:contact@digitalhood.info',
  },
  {
    icon: MapPin,
    title: 'Location',
    value: 'Lusaka, Zambia',
    helper: 'DigitalHood Marketplace',
  },
  {
    icon: Clock,
    title: 'Business Hours',
    value: 'Monday - Saturday',
    helper: '8:00 AM - 6:00 PM',
  },
]

const caseTypes = [
  { value: 'GENERAL_CONTACT', label: 'General inquiry' },
  { value: 'QUOTE_REQUEST', label: 'Quotation request' },
  { value: 'PRODUCT_INQUIRY', label: 'Product inquiry' },
  { value: 'ORDER_SUPPORT', label: 'Order support' },
  { value: 'PAYMENT_SUPPORT', label: 'Payment support' },
  { value: 'DELIVERY_SUPPORT', label: 'Delivery support' },
  { value: 'RETURN_REFUND', label: 'Return or refund' },
  { value: 'WARRANTY_CLAIM', label: 'Warranty claim' },
  { value: 'SELLER_SUPPORT', label: 'Seller support' },
  { value: 'BUSINESS_INQUIRY', label: 'Business inquiry' },
  { value: 'TECHNICAL_ISSUE', label: 'Technical issue' },
]

function getInitialStartedAt() {
  return Date.now()
}

export default function ContactPage() {
  const [startedAt] = useState(getInitialStartedAt)
  const [type, setType] = useState('GENERAL_CONTACT')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [companyWebsite, setCompanyWebsite] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [caseNumber, setCaseNumber] = useState('')
  const [customerEmailSent, setCustomerEmailSent] = useState(false)
  const [copied, setCopied] = useState(false)

  const selectedCaseLabel = useMemo(() => {
    return caseTypes.find((item) => item.value === type)?.label || 'Support request'
  }, [type])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmitting) return

    setError('')
    setCopied(false)
    setIsSubmitting(true)

    try {
      const response = await fetch(`${PAYMENTS_API_URL}/api/support/cases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          name,
          email,
          phone,
          subject,
          message,
          companyWebsite,
          startedAt,
          pageUrl: window.location.href,
        }),
      })

      const data = (await response.json().catch(() => null)) as SupportCaseResponse | null

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.details ||
            data?.error ||
            `Unable to send your message. Please try again.`
        )
      }

      const createdCaseNumber = data.caseNumber || data.case?.caseNumber || ''

      setCaseNumber(createdCaseNumber)
      setCustomerEmailSent(Boolean(data.email?.customerSent))
      setName('')
      setEmail('')
      setPhone('')
      setSubject('')
      setMessage('')
      setType('GENERAL_CONTACT')
      setCompanyWebsite('')
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Unable to send your message. Please try again.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function copyCaseNumber() {
    if (!caseNumber) return

    try {
      await navigator.clipboard.writeText(caseNumber)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="py-5 lg:py-8">
        <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8 xl:px-12">
          <nav className="mb-5 flex flex-wrap items-center gap-2 text-sm text-dh-dark-gray">
            <Link to="/" className="hover:text-dh-primary">
              Home
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="font-medium text-dh-primary">Contact Us</span>
          </nav>

          <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-dh-primary via-[#1d1a78] to-[#0f0d3d] p-5 text-white shadow-sm sm:p-7 lg:p-10">
            <div className="grid gap-6 lg:grid-cols-[1fr_0.75fr] lg:items-center">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-dh-secondary">
                  <ShieldCheck className="h-4 w-4" />
                  DigitalHood Support Cases
                </div>

                <h1 className="font-display text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                  Contact DigitalHood Zambia
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
                  Send us your question, quotation request, order inquiry, seller support message,
                  or product issue. You will receive a DigitalHood case number immediately.
                </p>
              </div>

              <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/15">
                <p className="text-sm font-bold text-dh-secondary">Trackable support</p>
                <p className="mt-2 text-sm leading-6 text-white/75">
                  Every message creates a support case so our team can follow up professionally.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-5">
            <div className="overflow-hidden rounded-[2rem] bg-white p-4 shadow-sm ring-1 ring-dh-light-gray sm:p-6">
              {caseNumber ? (
                <div className="rounded-[1.75rem] bg-gradient-to-br from-green-50 to-white p-5 text-center ring-1 ring-green-100 sm:p-8">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
                    <CheckCircle2 className="h-9 w-9" />
                  </div>

                  <h2 className="mt-5 font-display text-3xl font-black text-dh-primary">
                    Message received
                  </h2>

                  <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-dh-dark-gray">
                    Your DigitalHood support case has been created. Keep this case number for
                    follow-up.
                  </p>

                  <div className="mx-auto mt-6 max-w-xl rounded-3xl bg-white p-4 shadow-sm ring-1 ring-dh-light-gray">
                    <p className="text-xs font-black uppercase tracking-wide text-dh-dark-gray">
                      Your case number
                    </p>
                    <p className="mt-2 break-words font-display text-2xl font-black text-dh-primary sm:text-3xl">
                      {caseNumber}
                    </p>

                    <button
                      type="button"
                      onClick={copyCaseNumber}
                      className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-dh-primary px-5 py-3 text-sm font-black text-white transition hover:bg-dh-secondary hover:text-dh-primary"
                    >
                      <Copy className="h-4 w-4" />
                      {copied ? 'Copied' : 'Copy case number'}
                    </button>
                  </div>

                  <p className="mt-5 text-sm font-semibold text-dh-dark-gray">
                    {customerEmailSent
                      ? 'We have also sent an acknowledgement email to you.'
                      : 'Your case was created. Please save the case number above.'}
                  </p>

                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setCaseNumber('')
                        setCustomerEmailSent(false)
                        setCopied(false)
                      }}
                      className="rounded-full border border-dh-light-gray bg-white px-5 py-3 text-sm font-black text-dh-primary transition hover:border-dh-primary"
                    >
                      Send another message
                    </button>

                    <Link
                      to="/shop"
                      className="rounded-full bg-dh-secondary px-5 py-3 text-sm font-black text-dh-primary transition hover:bg-dh-primary hover:text-white"
                    >
                      Continue shopping
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-5">
                    <h2 className="font-display text-2xl font-black text-dh-primary">
                      Send us a message
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-dh-dark-gray">
                      Fill in your details below. We will create a case number and send you an
                      acknowledgement email.
                    </p>
                  </div>

                  {error ? (
                    <div className="mb-5 rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700 ring-1 ring-red-100">
                      {error}
                    </div>
                  ) : null}

                  <form onSubmit={handleSubmit} className="grid gap-4">
                    <div className="hidden" aria-hidden="true">
                      <label htmlFor="companyWebsite">Company website</label>
                      <input
                        id="companyWebsite"
                        name="companyWebsite"
                        tabIndex={-1}
                        autoComplete="off"
                        value={companyWebsite}
                        onChange={(event) => setCompanyWebsite(event.target.value)}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2 text-sm font-black text-dh-primary">
                        Full name
                        <input
                          value={name}
                          onChange={(event) => setName(event.target.value)}
                          required
                          autoComplete="name"
                          placeholder="Your full name"
                          className="h-13 rounded-2xl border border-dh-light-gray bg-white px-4 text-sm font-semibold text-dh-primary outline-none transition focus:border-dh-primary focus:ring-4 focus:ring-dh-primary/10"
                        />
                      </label>

                      <label className="grid gap-2 text-sm font-black text-dh-primary">
                        Email address
                        <input
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          required
                          autoComplete="email"
                          placeholder="you@example.com"
                          className="h-13 rounded-2xl border border-dh-light-gray bg-white px-4 text-sm font-semibold text-dh-primary outline-none transition focus:border-dh-primary focus:ring-4 focus:ring-dh-primary/10"
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2 text-sm font-black text-dh-primary">
                        Phone number
                        <input
                          value={phone}
                          onChange={(event) => setPhone(event.target.value)}
                          autoComplete="tel"
                          placeholder="+260..."
                          className="h-13 rounded-2xl border border-dh-light-gray bg-white px-4 text-sm font-semibold text-dh-primary outline-none transition focus:border-dh-primary focus:ring-4 focus:ring-dh-primary/10"
                        />
                      </label>

                      <label className="grid gap-2 text-sm font-black text-dh-primary">
                        Request type
                        <select
                          value={type}
                          onChange={(event) => setType(event.target.value)}
                          className="h-13 rounded-2xl border border-dh-light-gray bg-white px-4 text-sm font-semibold text-dh-primary outline-none transition focus:border-dh-primary focus:ring-4 focus:ring-dh-primary/10"
                        >
                          {caseTypes.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className="grid gap-2 text-sm font-black text-dh-primary">
                      Subject
                      <input
                        value={subject}
                        onChange={(event) => setSubject(event.target.value)}
                        required
                        placeholder="What do you need help with?"
                        className="h-13 rounded-2xl border border-dh-light-gray bg-white px-4 text-sm font-semibold text-dh-primary outline-none transition focus:border-dh-primary focus:ring-4 focus:ring-dh-primary/10"
                      />
                    </label>

                    <label className="grid gap-2 text-sm font-black text-dh-primary">
                      Message
                      <textarea
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        required
                        minLength={10}
                        rows={7}
                        placeholder="Write your message here..."
                        className="resize-none rounded-2xl border border-dh-light-gray bg-white px-4 py-3 text-sm font-semibold leading-6 text-dh-primary outline-none transition focus:border-dh-primary focus:ring-4 focus:ring-dh-primary/10"
                      />
                    </label>

                    <div className="rounded-2xl bg-dh-light-gray/40 p-4">
                      <p className="text-sm font-black text-dh-primary">
                        Selected case type: {selectedCaseLabel}
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-dh-dark-gray">
                        Your message will be logged securely and assigned a DigitalHood case number.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex h-13 items-center justify-center gap-2 rounded-full bg-dh-primary px-6 text-sm font-black text-white transition hover:bg-dh-secondary hover:text-dh-primary disabled:cursor-not-allowed disabled:bg-dh-dark-gray disabled:text-white"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Sending message...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Send message
                        </>
                      )}
                    </button>
                  </form>
                </>
              )}
            </div>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {contactCards.map((card) => {
              const Icon = card.icon
              const content = (
                <div className="h-full rounded-3xl bg-white p-5 shadow-sm ring-1 ring-dh-light-gray transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-dh-secondary/15 text-dh-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-black uppercase tracking-wide text-dh-dark-gray">
                    {card.title}
                  </p>
                  <p className="mt-1 break-words font-display text-lg font-black text-dh-primary">
                    {card.value}
                  </p>
                  <p className="mt-2 text-sm font-medium text-dh-dark-gray">{card.helper}</p>
                </div>
              )

              return card.href ? (
                <a key={card.title} href={card.href}>
                  {content}
                </a>
              ) : (
                <div key={card.title}>{content}</div>
              )
            })}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
