import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileImage,
  Inbox,
  LifeBuoy,
  Loader2,
  MessageCircle,
  PackageCheck,
  Search,
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

type CaseFilter = 'all' | 'active' | 'waiting' | 'resolved'

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

function formatCompactDate(value?: string | null) {
  if (!value) return 'Not available'

  try {
    return new Intl.DateTimeFormat('en-ZM', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
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

  if (status === 'NEW') return 'Received'
  if (status === 'OPEN') return 'In review'
  if (status === 'PENDING') return 'Being handled'
  if (status === 'WAITING_FOR_CUSTOMER') return 'Needs your reply'
  if (status === 'RESOLVED') return 'Resolved'
  if (status === 'CLOSED') return 'Closed'

  return status
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function statusStyle(value?: string) {
  const status = normalizeStatus(value)

  if (status === 'WAITING_FOR_CUSTOMER') {
    return 'border-orange-200 bg-orange-50 text-orange-700'
  }

  if (status === 'NEW' || status === 'OPEN') {
    return 'border-blue-100 bg-blue-50 text-blue-700'
  }

  if (status === 'PENDING') {
    return 'border-amber-100 bg-amber-50 text-amber-700'
  }

  if (status === 'RESOLVED') {
    return 'border-green-100 bg-green-50 text-green-700'
  }

  if (status === 'CLOSED') {
    return 'border-slate-200 bg-slate-100 text-slate-600'
  }

  return 'border-gray-200 bg-gray-50 text-gray-700'
}

function isResolvedCase(item: AccountOrderCase) {
  return ['RESOLVED', 'CLOSED'].includes(normalizeStatus(item.status))
}

function needsCustomerReply(item: AccountOrderCase) {
  return (
    normalizeStatus(item.status) === 'WAITING_FOR_CUSTOMER' ||
    Boolean(item.awaitingCustomerResponse)
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
  return item.order?.orderNumber || item.order?.orderId || ''
}

function caseSearchText(item: AccountOrderCase) {
  return [
    item.caseNumber,
    item.subject,
    item.reason,
    item.reasonLabel,
    item.message,
    item.status,
    item.order?.orderNumber,
    item.order?.orderId,
  ]
    .join(' ')
    .toLowerCase()
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

function messageAuthor(message: {
  message: string
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

function CaseRow({
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
      className={`w-full border-b px-3.5 py-3 text-left transition last:border-b-0 sm:px-4 ${
        isSelected
          ? 'border-dh-light-gray bg-dh-primary/[0.045]'
          : 'border-slate-100 bg-white hover:bg-slate-50'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 shrink-0 rounded-full ${
                needsCustomerReply(item)
                  ? 'bg-orange-500'
                  : isResolvedCase(item)
                    ? 'bg-green-500'
                    : 'bg-blue-500'
              }`}
            />
            <p className="truncate text-[11px] font-black uppercase tracking-[0.1em] text-dh-dark-gray">
              {item.caseNumber}
            </p>
          </div>

          <h2 className="mt-1 line-clamp-1 text-sm font-black text-dh-primary">
            {caseTitle(item)}
          </h2>
        </div>

        <span
          className={`inline-flex shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold ${statusStyle(
            item.status
          )}`}
        >
          {statusLabel(item.status)}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-3 text-[11px] font-medium text-dh-dark-gray">
        {orderNumber && <span>Order #{orderNumber}</span>}
        <span className="truncate">
          Updated {formatCompactDate(item.updatedAt || item.createdAt)}
        </span>
        {!!item.attachments?.length && (
          <span className="ml-auto inline-flex items-center gap-1">
            <FileImage className="h-3 w-3" />
            {item.attachments.length}
          </span>
        )}
      </div>
    </button>
  )
}

function EmptyCases() {
  return (
    <section className="rounded-2xl border border-dashed border-dh-light-gray bg-white px-5 py-10 text-center">
      <Inbox className="mx-auto h-9 w-9 text-dh-secondary" />
      <h2 className="mt-3 font-display text-xl font-bold text-dh-primary">
        Your support inbox is clear
      </h2>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-dh-dark-gray">
        When you report an issue from an order, the case and every support
        update will appear here.
      </p>
      <Link
        to="/orders"
        className="mt-5 inline-flex h-10 items-center rounded-full bg-dh-primary px-5 text-sm font-bold text-white"
      >
        View orders
        <ArrowRight className="ml-2 h-4 w-4" />
      </Link>
    </section>
  )
}

export default function AccountSupportCasesPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading } = useAccount()

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

  const loadCases = useCallback(async (
    options: { silent?: boolean } = {}
  ) => {
    if (!options.silent) setIsCasesLoading(true)
    setErrorMessage('')

    try {
      const response = await getAllCustomerOrderCases()
      const nextCases = response.cases || []

      setCases(nextCases)
      setSelectedCaseNumber((current) =>
        current && nextCases.some((item) => item.caseNumber === current)
          ? current
          : nextCases[0]?.caseNumber || ''
      )
    } catch (error) {
      if (!options.silent) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load your support cases.'
        )
      }
    } finally {
      if (!options.silent) setIsCasesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return

    const startupTimer = window.setTimeout(() => {
      void loadCases()
    }, 0)

    const refreshTimer = window.setInterval(() => {
      void loadCases({ silent: true })
    }, 60_000)

    return () => {
      window.clearTimeout(startupTimer)
      window.clearInterval(refreshTimer)
    }
  }, [isAuthenticated, loadCases])

  const caseCounts = useMemo(
    () => ({
      active: cases.filter((item) => !isResolvedCase(item)).length,
      waiting: cases.filter(needsCustomerReply).length,
      resolved: cases.filter(isResolvedCase).length,
    }),
    [cases]
  )

  const filteredCases = useMemo(() => {
    const cleanedQuery = query.trim().toLowerCase()

    return cases.filter((item) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'active' && !isResolvedCase(item)) ||
        (filter === 'waiting' && needsCustomerReply(item)) ||
        (filter === 'resolved' && isResolvedCase(item))

      return (
        matchesFilter &&
        (!cleanedQuery || caseSearchText(item).includes(cleanedQuery))
      )
    })
  }, [cases, filter, query])

  const selectedCase = useMemo(
    () =>
      filteredCases.find(
        (item) => item.caseNumber === selectedCaseNumber
      ) ||
      filteredCases[0] ||
      null,
    [filteredCases, selectedCaseNumber]
  )

  if (isLoading || (!isAuthenticated && !isLoading)) {
    return (
      <div className="flex min-h-[100svh] flex-col bg-dh-gray">
        <Header />
        <main className="flex min-h-[60vh] items-center justify-center px-4">
          <Loader2 className="h-9 w-9 animate-spin text-dh-primary" />
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-[100svh] flex-col bg-dh-gray">
      <Header />

      <main className="flex-1 py-4 sm:py-6">
        <div className="mx-auto w-full max-w-[1400px] px-3 sm:px-5 lg:px-8">
          <nav className="flex items-center gap-1.5 text-xs font-semibold text-dh-dark-gray">
            <Link to="/account" className="hover:text-dh-primary">
              Account
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-dh-primary">Support cases</span>
          </nav>

          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <LifeBuoy className="h-5 w-5 text-dh-secondary" />
                <h1 className="font-display text-2xl font-bold text-dh-primary sm:text-3xl">
                  Support cases
                </h1>
              </div>
              <p className="mt-1 text-sm text-dh-dark-gray">
                One place for reports, replies and resolutions. Updates refresh automatically.
              </p>
            </div>

            <Link
              to="/orders"
              className="inline-flex h-10 items-center justify-center rounded-full border border-dh-light-gray bg-white px-4 text-xs font-bold text-dh-primary hover:border-dh-primary"
            >
              <PackageCheck className="mr-2 h-4 w-4" />
              Report from an order
            </Link>
          </div>

          <section className="mt-4 overflow-hidden rounded-2xl border border-dh-light-gray bg-white shadow-sm">
            <div className="grid lg:grid-cols-[360px_minmax(0,1fr)]">
              <aside className="border-b border-dh-light-gray lg:border-b-0 lg:border-r">
                <div className="border-b border-dh-light-gray p-3">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-dh-dark-gray" />
                    <Input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search case or order"
                      className="h-10 rounded-xl border-dh-light-gray bg-dh-gray pl-9"
                    />
                  </div>

                  <div className="mt-2 grid grid-cols-4 gap-1 rounded-xl bg-dh-gray p-1">
                    {(
                      [
                        ['all', 'All', cases.length],
                        ['active', 'Active', caseCounts.active],
                        ['waiting', 'Reply', caseCounts.waiting],
                        ['resolved', 'Done', caseCounts.resolved],
                      ] as Array<[CaseFilter, string, number]>
                    ).map(([value, label, count]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFilter(value)}
                        className={`rounded-lg px-1.5 py-2 text-[10px] font-bold transition ${
                          filter === value
                            ? 'bg-white text-dh-primary shadow-sm'
                            : 'text-dh-dark-gray hover:text-dh-primary'
                        }`}
                      >
                        {label} {count}
                      </button>
                    ))}
                  </div>
                </div>

                {isCasesLoading && !cases.length ? (
                  <div className="flex min-h-56 items-center justify-center">
                    <Loader2 className="h-7 w-7 animate-spin text-dh-primary" />
                  </div>
                ) : errorMessage && !cases.length ? (
                  <div className="p-5 text-center">
                    <AlertCircle className="mx-auto h-7 w-7 text-red-600" />
                    <p className="mt-2 text-sm font-semibold text-red-700">
                      {errorMessage}
                    </p>
                    <Button
                      type="button"
                      onClick={() => void loadCases()}
                      className="mt-4 h-9 rounded-full bg-dh-primary px-4 text-xs text-white"
                    >
                      Try again
                    </Button>
                  </div>
                ) : cases.length ? (
                  <div className="max-h-[34rem] overflow-y-auto">
                    {filteredCases.map((item) => (
                      <CaseRow
                        key={item.caseNumber}
                        item={item}
                        isSelected={selectedCase?.caseNumber === item.caseNumber}
                        onSelect={() => setSelectedCaseNumber(item.caseNumber)}
                      />
                    ))}

                    {!filteredCases.length && (
                      <div className="p-7 text-center">
                        <Search className="mx-auto h-7 w-7 text-dh-dark-gray" />
                        <p className="mt-2 text-sm font-bold text-dh-primary">
                          No matching cases
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4">
                    <EmptyCases />
                  </div>
                )}
              </aside>

              <div className="min-h-[30rem] bg-[#fbfbfc]">
                {selectedCase ? (
                  <div className="p-4 sm:p-5 lg:p-6">
                    <header className="flex flex-col gap-3 border-b border-dh-light-gray pb-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-dh-secondary">
                          {selectedCase.caseNumber}
                        </p>
                        <h2 className="mt-1 font-display text-xl font-bold text-dh-primary sm:text-2xl">
                          {caseTitle(selectedCase)}
                        </h2>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-dh-dark-gray">
                          {caseOrderNumber(selectedCase) && (
                            <span>Order #{caseOrderNumber(selectedCase)}</span>
                          )}
                          <span>Opened {formatCompactDate(selectedCase.createdAt)}</span>
                          <span>
                            Updated {formatCompactDate(selectedCase.updatedAt || selectedCase.createdAt)}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`inline-flex w-fit rounded-full border px-3 py-1.5 text-xs font-bold ${statusStyle(
                          selectedCase.status
                        )}`}
                      >
                        {statusLabel(selectedCase.status)}
                      </span>
                    </header>

                    {needsCustomerReply(selectedCase) && selectedCase.order?.orderId && (
                      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-orange-200 bg-orange-50 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-bold text-orange-800">
                            DigitalHood needs your reply
                          </p>
                          <p className="mt-0.5 text-xs text-orange-700">
                            Continue securely from the linked order.
                          </p>
                        </div>
                        <Link
                          to={`/track-order/${selectedCase.order.orderId}`}
                          className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-orange-700 px-4 text-xs font-bold text-white"
                        >
                          Reply now
                          <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                        </Link>
                      </div>
                    )}

                    <div className="mt-4 grid gap-4 xl:grid-cols-[0.78fr_1.22fr]">
                      <div className="space-y-4">
                        <section className="rounded-xl border border-dh-light-gray bg-white p-4">
                          <p className="text-[11px] font-black uppercase tracking-[0.1em] text-dh-dark-gray">
                            Your report
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-dh-primary">
                            {selectedCase.message || 'No case description available.'}
                          </p>
                        </section>

                        {!!selectedCase.attachments?.length && (
                          <section>
                            <p className="flex items-center gap-2 text-xs font-bold text-dh-primary">
                              <FileImage className="h-4 w-4" />
                              Evidence ({selectedCase.attachments.length})
                            </p>
                            <div className="mt-2 grid grid-cols-4 gap-2">
                              {selectedCase.attachments.map((attachment, index) => {
                                const url = attachmentUrl(attachment)

                                return (
                                  <a
                                    key={attachment.id || attachment.filename || index}
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="overflow-hidden rounded-lg border border-dh-light-gray bg-white"
                                  >
                                    <img
                                      src={url}
                                      alt={attachment.originalName || `Evidence ${index + 1}`}
                                      loading="lazy"
                                      className="aspect-square w-full object-cover"
                                    />
                                  </a>
                                )
                              })}
                            </div>
                          </section>
                        )}

                        {selectedCase.order?.orderId && (
                          <Link
                            to={`/track-order/${selectedCase.order.orderId}`}
                            className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-dh-light-gray bg-white text-xs font-bold text-dh-primary hover:border-dh-primary"
                          >
                            Open order #{caseOrderNumber(selectedCase)}
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        )}
                      </div>

                      <section className="rounded-xl border border-dh-light-gray bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="flex items-center gap-2 font-display text-base font-bold text-dh-primary">
                            <MessageCircle className="h-4 w-4 text-dh-secondary" />
                            Case updates
                          </h3>
                          <span className="text-[11px] font-semibold text-dh-dark-gray">
                            {selectedCase.messages?.length || 0} update
                            {(selectedCase.messages?.length || 0) === 1 ? '' : 's'}
                          </span>
                        </div>

                        <div className="mt-3 space-y-2.5">
                          {(selectedCase.messages || []).map((message, index) => (
                            <article
                              key={message.id || `${message.createdAt}-${index}`}
                              className="rounded-xl bg-dh-gray p-3.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-black text-dh-primary">
                                  {messageAuthor(message)}
                                </p>
                                <p className="flex shrink-0 items-center gap-1 text-[10px] text-dh-dark-gray">
                                  <CalendarDays className="h-3 w-3" />
                                  {formatDate(message.createdAt)}
                                </p>
                              </div>
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-dh-dark-gray">
                                {message.message}
                              </p>
                            </article>
                          ))}

                          {!selectedCase.messages?.length && (
                            <div className="rounded-xl bg-dh-gray px-4 py-7 text-center">
                              <Clock3 className="mx-auto h-6 w-6 text-dh-primary" />
                              <p className="mt-2 text-sm font-bold text-dh-primary">
                                Awaiting the first support update
                              </p>
                              <p className="mt-1 text-xs text-dh-dark-gray">
                                New replies will appear here automatically.
                              </p>
                            </div>
                          )}
                        </div>

                        {isResolvedCase(selectedCase) && (
                          <div className="mt-3 flex items-start gap-2 rounded-xl border border-green-100 bg-green-50 p-3 text-xs font-semibold text-green-700">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                            This case is {statusLabel(selectedCase.status).toLowerCase()} and remains available for your records.
                          </div>
                        )}
                      </section>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[30rem] items-center justify-center p-6 text-center">
                    <div>
                      <LifeBuoy className="mx-auto h-9 w-9 text-dh-secondary" />
                      <p className="mt-3 font-bold text-dh-primary">
                        Select a support case
                      </p>
                      <p className="mt-1 text-sm text-dh-dark-gray">
                        Its report and updates will appear here.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
