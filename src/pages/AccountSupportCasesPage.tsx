import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  ImageIcon,
  LifeBuoy,
  Loader2,
  PackageCheck,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react'

import Header from '@/sections/Header'
import Footer from '@/sections/Footer'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { useAccount } from '@/context/AccountContext'

import {
  getAllCustomerOrderCases,
  type AccountOrderCase,
  type AccountOrderCaseAttachment,
} from '@/api/account'

type CaseFilter =
  | 'all'
  | 'active'
  | 'new'
  | 'open'
  | 'pending'
  | 'resolved'
  | 'closed'

const SUPPORT_ASSET_ORIGIN =
  import.meta.env.VITE_PAYMENTS_API_URL ||
  'https://payments.digitalhood.info'

function formatDate(value?: string | null) {
  if (!value) return 'Not available'

  try {
    return new Intl.DateTimeFormat('en-ZM', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function normalizeStatus(value?: string) {
  const status = String(value || 'NEW')
    .trim()
    .toUpperCase()
    .replaceAll('-', '_')
    .replaceAll(' ', '_')

  if (status === 'IN_PROGRESS') return 'OPEN'
  if (status === 'WAITING_FOR_SELLER') return 'PENDING'
  if (status === 'DONE') return 'RESOLVED'

  return status
}

function statusLabel(value?: string) {
  const status = normalizeStatus(value)

  if (status === 'NEW') return 'New'
  if (status === 'OPEN') return 'Open'
  if (status === 'PENDING') return 'Pending'
  if (status === 'RESOLVED') return 'Resolved'
  if (status === 'CLOSED') return 'Closed'

  return status
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function statusStyle(value?: string) {
  const status = normalizeStatus(value)

  if (status === 'NEW') {
    return 'border-blue-100 bg-blue-50 text-blue-700'
  }

  if (status === 'OPEN') {
    return 'border-purple-100 bg-purple-50 text-purple-700'
  }

  if (status === 'PENDING') {
    return 'border-amber-100 bg-amber-50 text-amber-700'
  }

  if (status === 'WAITING_FOR_CUSTOMER') {
    return 'border-orange-200 bg-orange-50 text-orange-700'
  }

  if (status === 'RESOLVED') {
    return 'border-green-100 bg-green-50 text-green-700'
  }

  if (status === 'CLOSED') {
    return 'border-slate-200 bg-slate-100 text-slate-600'
  }

  return 'border-gray-200 bg-gray-50 text-gray-700'
}

function priorityStyle(value?: string) {
  const priority = String(value || 'NORMAL').toUpperCase()

  if (priority === 'URGENT') {
    return 'bg-red-50 text-red-700'
  }

  if (priority === 'HIGH') {
    return 'bg-orange-50 text-orange-700'
  }

  return 'bg-dh-gray text-dh-primary'
}

function isActiveCase(item: AccountOrderCase) {
  return !['RESOLVED', 'CLOSED'].includes(
    normalizeStatus(item.status)
  )
}

function caseTitle(item: AccountOrderCase) {
  return (
    item.subject ||
    item.reasonLabel ||
    item.reason ||
    item.type ||
    'Order support case'
  )
}

function caseOrderNumber(item: AccountOrderCase) {
  return (
    item.order?.orderNumber ||
    item.order?.orderId ||
    ''
  )
}

function caseSearchText(item: AccountOrderCase) {
  return [
    item.caseNumber,
    item.subject,
    item.reason,
    item.reasonLabel,
    item.message,
    item.status,
    item.priority,
    item.order?.orderNumber,
    item.order?.orderId,
  ]
    .join(' ')
    .toLowerCase()
}

function attachmentUrl(
  attachment: AccountOrderCaseAttachment
) {
  const value = String(attachment.url || '').trim()

  if (!value) return ''

  try {
    return new URL(value, SUPPORT_ASSET_ORIGIN).toString()
  } catch {
    return value
  }
}

function messageAuthor(message: {
  message: string
  createdAt?: string
  [key: string]: unknown
}) {
  const author =
    message.authorName ||
    message.author ||
    message.senderName ||
    message.sender

  if (author) return String(author)

  const direction = String(
    message.direction ||
    message.senderType ||
    message.role ||
    ''
  ).toLowerCase()

  if (
    direction.includes('customer') ||
    direction.includes('inbound')
  ) {
    return 'You'
  }

  return 'DigitalHood Support'
}

function SummaryCard({
  icon,
  label,
  value,
  helper,
}: {
  icon: React.ReactNode
  label: string
  value: number
  helper: string
}) {
  return (
    <article className="rounded-3xl bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-dh-secondary/15 text-dh-primary">
          {icon}
        </span>

        <span className="font-display text-2xl font-bold text-dh-primary">
          {value}
        </span>
      </div>

      <p className="mt-4 text-sm font-semibold text-dh-primary">
        {label}
      </p>

      <p className="mt-1 text-xs leading-5 text-dh-dark-gray">
        {helper}
      </p>
    </article>
  )
}

function CaseListItem({
  item,
  isSelected,
  onSelect,
}: {
  item: AccountOrderCase
  isSelected: boolean
  onSelect: () => void
}) {
  const orderNumber = caseOrderNumber(item)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-3xl border p-4 text-left transition sm:p-5 ${
        isSelected
          ? 'border-dh-primary bg-dh-primary/[0.04] shadow-sm'
          : 'border-dh-light-gray bg-white hover:border-dh-primary/30'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-dh-primary">
            {item.caseNumber}
          </p>

          <h2 className="mt-1 line-clamp-2 font-display text-lg font-bold text-dh-primary">
            {caseTitle(item)}
          </h2>
        </div>

        <span
          className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle(
            item.status
          )}`}
        >
          {statusLabel(item.status)}
        </span>
      </div>

      <p className="mt-3 line-clamp-2 text-sm leading-6 text-dh-dark-gray">
        {item.message || 'No case description available.'}
      </p>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-medium text-dh-dark-gray">
        {orderNumber && (
          <span>Order #{orderNumber}</span>
        )}

        <span>Opened {formatDate(item.createdAt)}</span>

        {!!item.attachments?.length && (
          <span>
            {item.attachments.length} photo
            {item.attachments.length === 1 ? '' : 's'}
          </span>
        )}
      </div>
    </button>
  )
}

function EmptyCases() {
  return (
    <section className="rounded-3xl bg-white p-8 text-center shadow-sm sm:p-12">
      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-dh-secondary/15 text-dh-primary">
        <LifeBuoy className="h-8 w-8" />
      </span>

      <h2 className="mt-5 font-display text-2xl font-bold text-dh-primary">
        No support cases yet
      </h2>

      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-dh-dark-gray">
        When you report an issue from an order, its progress and
        DigitalHood support updates will appear here.
      </p>

      <Link to="/orders">
        <Button className="mt-6 h-11 rounded-full bg-dh-primary px-6 font-semibold text-white hover:bg-dh-secondary">
          View your orders
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    </section>
  )
}

export default function AccountSupportCasesPage() {
  const navigate = useNavigate()

  const {
    isAuthenticated,
    isLoading,
  } = useAccount()

  const [cases, setCases] = useState<AccountOrderCase[]>([])
  const [selectedCaseNumber, setSelectedCaseNumber] = useState('')
  const [isCasesLoading, setIsCasesLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<CaseFilter>('all')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login?redirect=/account/support-cases')
    }
  }, [isAuthenticated, isLoading, navigate])

  async function loadCases() {
    setIsCasesLoading(true)
    setErrorMessage('')

    try {
      const response = await getAllCustomerOrderCases()
      const nextCases = response.cases || []

      setCases(nextCases)

      setSelectedCaseNumber((current) => {
        if (
          current &&
          nextCases.some((item) => item.caseNumber === current)
        ) {
          return current
        }

        return nextCases[0]?.caseNumber || ''
      })
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load your support cases.'
      )
    } finally {
      setIsCasesLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated) return

    void loadCases()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const caseCounts = useMemo(() => {
    return {
      total: cases.length,
      active: cases.filter(isActiveCase).length,
      pending: cases.filter((item) =>
        ['PENDING', 'WAITING_FOR_CUSTOMER'].includes(
          normalizeStatus(item.status)
        )
      ).length,
      resolved: cases.filter((item) =>
        ['RESOLVED', 'CLOSED'].includes(
          normalizeStatus(item.status)
        )
      ).length,
    }
  }, [cases])

  const filteredCases = useMemo(() => {
    const cleanedQuery = query.trim().toLowerCase()

    return cases.filter((item) => {
      const status = normalizeStatus(item.status)

      const matchesFilter =
        filter === 'all' ||
        (filter === 'active' && isActiveCase(item)) ||
        status === filter.toUpperCase() ||
        (
          filter === 'pending' &&
          status === 'WAITING_FOR_CUSTOMER'
        )

      const matchesQuery =
        !cleanedQuery ||
        caseSearchText(item).includes(cleanedQuery)

      return matchesFilter && matchesQuery
    })
  }, [cases, filter, query])

  const selectedCase = useMemo(() => {
    return (
      cases.find(
        (item) => item.caseNumber === selectedCaseNumber
      ) ||
      filteredCases[0] ||
      null
    )
  }, [cases, filteredCases, selectedCaseNumber])

  if (isLoading || (!isAuthenticated && !isLoading)) {
    return (
      <div className="min-h-screen bg-dh-gray">
        <Header />

        <main className="flex min-h-[60vh] items-center justify-center px-4">
          <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-dh-primary" />

            <p className="mt-4 text-sm font-semibold text-dh-dark-gray">
              Loading your support account...
            </p>
          </div>
        </main>

        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dh-gray">
      <Header />

      <main className="py-5 lg:py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <nav className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm text-dh-dark-gray shadow-sm">
            <Link to="/" className="hover:text-dh-primary">
              Home
            </Link>

            <ChevronRight className="h-4 w-4" />

            <Link
              to="/account"
              className="hover:text-dh-primary"
            >
              My Account
            </Link>

            <ChevronRight className="h-4 w-4" />

            <span className="font-semibold text-dh-primary">
              Support Cases
            </span>
          </nav>

          <section className="rounded-[2rem] bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-3xl bg-dh-secondary/15 p-3 text-dh-primary">
                  <LifeBuoy className="h-7 w-7" />
                </span>

                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Secure account support
                  </div>

                  <h1 className="mt-3 font-display text-2xl font-bold text-dh-primary sm:text-3xl">
                    My Support Cases
                  </h1>

                  <p className="mt-1 max-w-2xl text-sm leading-6 text-dh-dark-gray">
                    Track order issues, review case progress and see
                    updates from DigitalHood Support.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link to="/orders">
                  <Button
                    variant="outline"
                    className="h-11 rounded-full border-dh-primary px-5 font-semibold text-dh-primary hover:bg-dh-primary hover:text-white"
                  >
                    <PackageCheck className="mr-2 h-4 w-4" />
                    My orders
                  </Button>
                </Link>

                <Button
                  type="button"
                  onClick={() => void loadCases()}
                  disabled={isCasesLoading}
                  className="h-11 rounded-full bg-dh-primary px-5 font-semibold text-white hover:bg-dh-secondary"
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${
                      isCasesLoading ? 'animate-spin' : ''
                    }`}
                  />
                  Refresh
                </Button>
              </div>
            </div>
          </section>

          <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              icon={<FileText className="h-5 w-5" />}
              label="All cases"
              value={caseCounts.total}
              helper="Every issue opened from your orders."
            />

            <SummaryCard
              icon={<Clock3 className="h-5 w-5" />}
              label="Active cases"
              value={caseCounts.active}
              helper="Cases still being reviewed."
            />

            <SummaryCard
              icon={<LifeBuoy className="h-5 w-5" />}
              label="Pending"
              value={caseCounts.pending}
              helper="Cases waiting for the next update."
            />

            <SummaryCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              label="Resolved"
              value={caseCounts.resolved}
              helper="Cases completed by the support team."
            />
          </section>

          {errorMessage && (
            <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          {isCasesLoading && !cases.length ? (
            <section className="mt-5 rounded-3xl bg-white p-10 text-center shadow-sm">
              <Loader2 className="mx-auto h-9 w-9 animate-spin text-dh-primary" />

              <p className="mt-4 text-sm font-semibold text-dh-dark-gray">
                Loading your support cases...
              </p>
            </section>
          ) : !cases.length ? (
            <div className="mt-5">
              <EmptyCases />
            </div>
          ) : (
            <>
              <section className="mt-5 rounded-3xl bg-white p-4 shadow-sm sm:p-5">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-dh-dark-gray" />

                    <Input
                      value={query}
                      onChange={(event) =>
                        setQuery(event.target.value)
                      }
                      placeholder="Search case number, order or issue..."
                      className="h-11 rounded-full border-dh-light-gray pl-11"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ['all', 'All'],
                        ['active', 'Active'],
                        ['new', 'New'],
                        ['open', 'Open'],
                        ['pending', 'Pending'],
                        ['resolved', 'Resolved'],
                        ['closed', 'Closed'],
                      ] as Array<[CaseFilter, string]>
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFilter(value)}
                        className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                          filter === value
                            ? 'bg-dh-primary text-white'
                            : 'bg-dh-gray text-dh-primary hover:bg-dh-secondary/20'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-3">
                  {filteredCases.map((item) => (
                    <CaseListItem
                      key={item.caseNumber}
                      item={item}
                      isSelected={
                        selectedCase?.caseNumber === item.caseNumber
                      }
                      onSelect={() =>
                        setSelectedCaseNumber(item.caseNumber)
                      }
                    />
                  ))}

                  {!filteredCases.length && (
                    <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
                      <Search className="mx-auto h-9 w-9 text-dh-dark-gray" />

                      <p className="mt-3 font-semibold text-dh-primary">
                        No matching cases
                      </p>

                      <p className="mt-1 text-sm text-dh-dark-gray">
                        Change the search or status filter.
                      </p>
                    </div>
                  )}
                </div>

                {selectedCase && (
                  <aside className="h-fit rounded-3xl bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-32">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-dh-light-gray pb-5">
                      <div>
                        <p className="text-sm font-bold text-dh-secondary">
                          {selectedCase.caseNumber}
                        </p>

                        <h2 className="mt-1 font-display text-2xl font-bold text-dh-primary">
                          {caseTitle(selectedCase)}
                        </h2>
                      </div>

                      <span
                        className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${statusStyle(
                          selectedCase.status
                        )}`}
                      >
                        {statusLabel(selectedCase.status)}
                      </span>
                    </div>

                    {selectedCase.canReply &&
                      selectedCase.order?.orderId && (
                        <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 p-4">
                          <p className="font-semibold text-orange-800">
                            DigitalHood needs more information
                          </p>

                          <p className="mt-1 text-sm leading-6 text-orange-700">
                            Open the linked order to respond securely.
                          </p>

                          <Link
                            to={`/orders/${selectedCase.order.orderId}`}
                            className="mt-3 inline-flex items-center font-semibold text-dh-primary hover:text-dh-secondary"
                          >
                            Open order and respond
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </div>
                      )}

                    <section className="mt-5 rounded-3xl bg-dh-gray p-4 sm:p-5">
                      <p className="text-xs font-bold uppercase tracking-wide text-dh-dark-gray">
                        Your original report
                      </p>

                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-dh-primary">
                        {selectedCase.message ||
                          'No case description available.'}
                      </p>
                    </section>

                    <section className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-dh-light-gray p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-dh-dark-gray">
                          Order
                        </p>

                        {selectedCase.order?.orderId ? (
                          <Link
                            to={`/orders/${selectedCase.order.orderId}`}
                            className="mt-2 inline-flex items-center font-semibold text-dh-primary hover:text-dh-secondary"
                          >
                            #{caseOrderNumber(selectedCase)}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        ) : (
                          <p className="mt-2 font-semibold text-dh-primary">
                            Not available
                          </p>
                        )}
                      </div>

                      <div className="rounded-2xl border border-dh-light-gray p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-dh-dark-gray">
                          Priority
                        </p>

                        <span
                          className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${priorityStyle(
                            selectedCase.priority
                          )}`}
                        >
                          {selectedCase.priority || 'Normal'}
                        </span>
                      </div>

                      <div className="rounded-2xl border border-dh-light-gray p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-dh-dark-gray">
                          Opened
                        </p>

                        <p className="mt-2 text-sm font-semibold text-dh-primary">
                          {formatDate(selectedCase.createdAt)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-dh-light-gray p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-dh-dark-gray">
                          Last updated
                        </p>

                        <p className="mt-2 text-sm font-semibold text-dh-primary">
                          {formatDate(
                            selectedCase.updatedAt ||
                              selectedCase.createdAt
                          )}
                        </p>
                      </div>
                    </section>

                    {!!selectedCase.attachments?.length && (
                      <section className="mt-6">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-5 w-5 text-dh-primary" />

                          <h3 className="font-display text-lg font-bold text-dh-primary">
                            Attached photos
                          </h3>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {selectedCase.attachments.map(
                            (attachment, index) => {
                              const imageUrl =
                                attachmentUrl(attachment)

                              return (
                                <a
                                  key={
                                    attachment.id ||
                                    attachment.filename ||
                                    index
                                  }
                                  href={imageUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="group overflow-hidden rounded-2xl border border-dh-light-gray bg-dh-gray"
                                >
                                  <img
                                    src={imageUrl}
                                    alt={
                                      attachment.originalName ||
                                      attachment.filename ||
                                      `Case attachment ${index + 1}`
                                    }
                                    loading="lazy"
                                    className="aspect-square w-full object-cover transition group-hover:scale-105"
                                  />
                                </a>
                              )
                            }
                          )}
                        </div>
                      </section>
                    )}

                    <section className="mt-6">
                      <div className="flex items-center gap-2">
                        <LifeBuoy className="h-5 w-5 text-dh-primary" />

                        <h3 className="font-display text-lg font-bold text-dh-primary">
                          Support updates
                        </h3>
                      </div>

                      <div className="mt-4 space-y-3">
                        {(selectedCase.messages || []).map(
                          (message, index) => (
                            <article
                              key={
                                message.id ||
                                `${message.createdAt}-${index}`
                              }
                              className="rounded-2xl border border-dh-light-gray p-4"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-bold text-dh-primary">
                                  {messageAuthor(message)}
                                </p>

                                <p className="flex items-center gap-1 text-xs text-dh-dark-gray">
                                  <CalendarDays className="h-3.5 w-3.5" />
                                  {formatDate(message.createdAt)}
                                </p>
                              </div>

                              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-dh-dark-gray">
                                {message.message}
                              </p>
                            </article>
                          )
                        )}

                        {!selectedCase.messages?.length && (
                          <div className="rounded-2xl bg-dh-gray p-5 text-center">
                            <Clock3 className="mx-auto h-7 w-7 text-dh-primary" />

                            <p className="mt-3 text-sm font-semibold text-dh-primary">
                              No support replies yet
                            </p>

                            <p className="mt-1 text-xs leading-5 text-dh-dark-gray">
                              DigitalHood Support updates will appear
                              here when the case is reviewed.
                            </p>
                          </div>
                        )}
                      </div>
                    </section>

                    {['RESOLVED', 'CLOSED'].includes(
                      normalizeStatus(selectedCase.status)
                    ) && (
                      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

                        <p>
                          This support case has been{' '}
                          {statusLabel(selectedCase.status).toLowerCase()}.
                        </p>
                      </div>
                    )}
                  </aside>
                )}
              </section>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
