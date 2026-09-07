import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import {
  ArrowDown,
  ArrowLeft,
  Check,
  CheckCheck,
  ImageIcon,
  Loader2,
  MessageCircle,
  Paperclip,
  PackageCheck,
  RefreshCw,
  Search,
  Send,
  Store,
  Video,
  X,
} from 'lucide-react'
import type {
  Socket
} from 'socket.io-client'

import Header from '@/sections/Header'
import Footer from '@/sections/Footer'
import ChatImageLightbox from '@/components/chat/ChatImageLightbox'
import {
  createBuyerChatSocket,
  deleteBuyerMessage,
  editBuyerMessage,
  getBuyerInbox,
  getBuyerMessages,
  markBuyerDelivered,
  markBuyerRead,
  sendBuyerMessage,
  sendBuyerMedia,
  sendBuyerOrder,
  sendBuyerProduct,
  type ChatInboxItem,
  type ChatAttachment,
  type ChatMessage,
  type ChatOrderIntent,
  type ChatProductIntent,
  type ChatReceiptSummary,
} from '@/api/chat'
import {
  getAccountToken
} from '@/api/account'
import {
  CHAT_MEDIA_ACCEPT,
  CHAT_MEDIA_BATCH_LIMIT,
  prepareChatMediaFile,
  validateChatMediaInput,
} from '@/lib/chatMediaPreparation'

type PendingProductIntent =
  ChatProductIntent & {
    conversationId: string
    clientMessageId: string
  }

type PendingOrderIntent =
  ChatOrderIntent & {
    conversationId: string
    clientMessageId: string
  }

const MESSAGE_MUTATION_WINDOW_MS =
  10 * 60 * 1000

type PendingMediaItem = {
  id: string
  file: File
  previewUrl: string
  originalSize: number
  progress: number
  status: 'ready' | 'uploading' | 'sent' | 'error'
  error?: string
}

type OutgoingMediaItem = PendingMediaItem & {
  conversationId: string
  clientMessageId: string
  replyToMessageId?: string
}

function canMutateMessage(
  message: ChatMessage,
  now = Date.now()
) {
  const createdAt = new Date(
    message.createdAt || ''
  ).getTime()

  return (
    !message.deleted &&
    message.sender?.type === 'buyer' &&
    (message.messageType || message.type) === 'text' &&
    Boolean(message.text) &&
    Boolean(getChatMessageId(message)) &&
    Number.isFinite(createdAt) &&
    now - createdAt <= MESSAGE_MUTATION_WINDOW_MS
  )
}

function canRecallMessage(
  message: ChatMessage,
  now = Date.now()
) {
  const createdAt = new Date(message.createdAt || '').getTime()
  const messageKind = message.messageType || message.type

  return (
    !message.deleted &&
    message.sender?.type === 'buyer' &&
    ['text', 'image', 'video'].includes(messageKind || '') &&
    Boolean(getChatMessageId(message)) &&
    Number.isFinite(createdAt) &&
    now - createdAt <= MESSAGE_MUTATION_WINDOW_MS
  )
}

function formatMediaSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return ''

  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`
}

function formatChatTime(
  value?: string
) {
  if (!value) return ''

  try {
    return new Intl.DateTimeFormat(
      'en-ZM',
      {
        dateStyle: 'medium',
        timeStyle: 'short',
      }
    ).format(
      new Date(value)
    )
  } catch {
    return value
  }
}

function chatMessageDateKey(
  value?: string
) {
  if (!value) return ''

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return ''
  }

  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1
    ).padStart(2, '0'),
    String(
      date.getDate()
    ).padStart(2, '0')
  ].join('-')
}

function formatMessageDate(
  value?: string
) {
  if (!value) return ''

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value
  }

  const today =
    new Date()

  const yesterday =
    new Date()

  yesterday.setDate(
    today.getDate() - 1
  )

  const key =
    chatMessageDateKey(value)

  if (
    key ===
    chatMessageDateKey(
      today.toISOString()
    )
  ) {
    return 'Today'
  }

  if (
    key ===
    chatMessageDateKey(
      yesterday.toISOString()
    )
  ) {
    return 'Yesterday'
  }

  return new Intl.DateTimeFormat(
    'en-ZM',
    {
      dateStyle: 'medium'
    }
  ).format(date)
}

function formatMessageTime(
  value?: string
) {
  if (!value) return ''

  try {
    return new Intl.DateTimeFormat(
      'en-ZM',
      {
        timeStyle: 'short'
      }
    ).format(
      new Date(value)
    )
  } catch {
    return value
  }
}

function getReplyPreviewText(
  message?: ChatMessage | null
) {
  if (!message) {
    return 'Earlier message'
  }

  if (message.deleted) {
    return 'Message deleted'
  }

  const messageKind =
    message.messageType ||
    message.type

  if (
    messageKind ===
    'product_card'
  ) {
    return 'Product shared'
  }

  if (
    messageKind ===
    'order_card'
  ) {
    return 'Order shared'
  }

  if (messageKind === 'image') {
    return 'Photo'
  }

  if (messageKind === 'video') {
    return 'Video'
  }

  return (
    message.text ||
    'Message'
  )
}

function getConversationTitle(
  item?: ChatInboxItem
) {
  return (
    item?.counterparty?.displayName ||
    item?.counterpartyName ||
    item?.storeName ||
    item?.sellerStoreName ||
    'Marketplace seller'
  )
}

function formatLastSeen(
  value?: string | null
) {
  if (!value) {
    return 'Seller offline'
  }

  return `Last seen ${formatChatTime(
    value
  )}`
}

function getInitials(
  value: string,
  fallback: string
) {
  const parts =
    value
      .trim()
      .split(/\s+/)
      .filter(Boolean)

  if (parts.length === 0) {
    return fallback
  }

  return parts
    .slice(0, 2)
    .map(
      part =>
        part
          .charAt(0)
          .toUpperCase()
    )
    .join('')
}

function isDigitalHoodProfile(
  value: string
) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .includes('digitalhood')
}

function ConversationAvatar({
  item,
  online = false,
  size = 'md',
}: {
  item?: ChatInboxItem
  online?: boolean
  size?: 'xs' | 'sm' | 'md'
}) {
  const name =
    getConversationTitle(item)

  const avatarUrl =
    item?.counterparty
      ?.avatarUrl ||
    (isDigitalHoodProfile(name)
      ? '/logo.jpg'
      : '') ||
    ''

  const sizeClass =
    size === 'xs'
      ? 'h-8 w-8 text-[10px]'
      : size === 'sm'
      ? 'h-10 w-10 text-xs'
      : 'h-11 w-11 text-sm'

  return (
    <div
      className={`relative flex ${sizeClass} shrink-0 items-center justify-center overflow-visible rounded-full bg-dh-secondary/15 font-black text-dh-primary`}
    >
      <span>
        {getInitials(
          name,
          'S'
        )}
      </span>

      {avatarUrl && (
        <img
          src={avatarUrl}
          alt={`${name} avatar`}
          className="absolute inset-0 h-full w-full rounded-full object-cover"
          onError={event => {
            if (
              isDigitalHoodProfile(name) &&
              event.currentTarget.dataset.fallbackApplied !== 'true'
            ) {
              event.currentTarget.dataset.fallbackApplied = 'true'
              event.currentTarget.src = '/logo.jpg'
              return
            }

            event.currentTarget.style.display =
              'none'
          }}
        />
      )}

      {online && (
        <span
          className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500"
          aria-label="Online"
        />
      )}
    </div>
  )
}

function MessageAvatar({
  message,
  fallbackItem,
  fallbackLabel,
}: {
  message: ChatMessage
  fallbackItem?: ChatInboxItem
  fallbackLabel: string
}) {
  const displayName =
    message.sender?.displayName ||
    (message.sender?.type === 'seller'
      ? getConversationTitle(fallbackItem)
      : fallbackLabel)
  const avatarUrl =
    message.sender?.avatarUrl ||
    (message.sender?.type === 'seller'
      ? fallbackItem?.counterparty?.avatarUrl
      : null) ||
    (isDigitalHoodProfile(displayName)
      ? '/logo.jpg'
      : null)

  return (
    <span className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-[9px] font-black text-dh-primary shadow-sm ring-1 ring-slate-200">
      {getInitials(displayName, message.sender?.type === 'seller' ? 'S' : 'B')}
      {avatarUrl && (
        <img
          src={avatarUrl}
          alt={`${displayName} profile`}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={(event) => {
            if (
              isDigitalHoodProfile(displayName) &&
              event.currentTarget.dataset.fallbackApplied !== 'true'
            ) {
              event.currentTarget.dataset.fallbackApplied = 'true'
              event.currentTarget.src = '/logo.jpg'
              return
            }

            event.currentTarget.style.display = 'none'
          }}
        />
      )}
    </span>
  )
}

function MediaAttachmentCard({
  attachment,
  isMine,
  onOpenImage,
}: {
  attachment: ChatAttachment
  isMine: boolean
  onOpenImage: (attachment: ChatAttachment) => void
}) {
  const [failed, setFailed] = useState(false)
  const unavailable = !attachment.url || failed
  const meta = [attachment.fileName, formatMediaSize(attachment.sizeBytes)]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="min-w-[190px] max-w-sm">
      {unavailable ? (
        <div
          className={`flex min-h-32 flex-col items-center justify-center rounded-2xl border border-dashed p-4 text-center ${
            isMine
              ? 'border-white/30 bg-white/10 text-white/75'
              : 'border-slate-300 bg-slate-50 text-slate-500'
          }`}
        >
          {attachment.kind === 'image' ? (
            <ImageIcon className="h-7 w-7" />
          ) : (
            <Video className="h-7 w-7" />
          )}
          <p className="mt-2 text-xs font-bold">Media unavailable</p>
          <p className="mt-1 text-[10px] font-medium opacity-80">
            This attachment may have expired.
          </p>
        </div>
      ) : attachment.kind === 'image' ? (
        <button
          type="button"
          onClick={() => onOpenImage(attachment)}
          className="block overflow-hidden rounded-2xl bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-dh-secondary"
          aria-label={`Open ${attachment.fileName} full screen`}
        >
          <img
            src={attachment.url || ''}
            alt={attachment.fileName || 'Shared photo'}
            className="max-h-80 w-full object-contain"
            loading="lazy"
            decoding="async"
            onError={() => setFailed(true)}
          />
        </button>
      ) : (
        <video
          src={attachment.url || undefined}
          controls
          playsInline
          preload="metadata"
          className="max-h-80 w-full rounded-2xl bg-black"
          aria-label={attachment.fileName || 'Shared video'}
          onError={() => setFailed(true)}
        />
      )}

      {meta && (
        <p
          className={`mt-1.5 truncate text-[10px] font-semibold ${
            isMine ? 'text-white/65' : 'text-slate-400'
          }`}
          title={meta}
        >
          {meta}
        </p>
      )}
    </div>
  )
}

function getContextSnapshot(
  message: ChatMessage
) {
  const context =
    message.contexts?.[0]

  return (
    context?.safeSnapshot ||
    context?.snapshot ||
    null
  )
}

function ProductContextCard({
  message,
}: {
  message: ChatMessage
}) {
  const snapshot =
    getContextSnapshot(
      message
    )

  if (!snapshot) {
    return null
  }

  const name =
    String(
      snapshot.name ||
      snapshot.productName ||
      'Marketplace product'
    )

  const image =
    String(
      snapshot.imageUrl ||
      snapshot.image ||
      ''
    )

  const price =
    snapshot.price !==
      undefined &&
    snapshot.price !==
      null
      ? String(
          snapshot.price
        )
      : ''

  const productReference = String(
    snapshot.slug ||
    snapshot.productSlug ||
    snapshot.productId ||
    snapshot.id ||
    ''
  ).trim()

  const card = (
    <div className="flex items-center gap-2 p-2">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
        {image ? (
          <img src={image} alt={name} className="h-full w-full object-cover" />
        ) : (
          <Store className="h-5 w-5 text-dh-primary" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black uppercase tracking-wide text-dh-secondary">Product inquiry</p>
        <p className="truncate text-xs font-black text-dh-primary">{name}</p>
        {price && <p className="mt-0.5 text-[11px] font-bold text-slate-500">{price}</p>}
      </div>

      {productReference && <span className="shrink-0 text-[10px] font-black text-dh-primary">View →</span>}
    </div>
  )

  return (
    <div className="mb-1 overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm">
      {productReference ? (
        <Link to={`/product/${encodeURIComponent(productReference)}`} className="block transition hover:bg-slate-50" aria-label={`View ${name}`}>
          {card}
        </Link>
      ) : card}
    </div>
  )
}

function formatOrderAmount(
  value: unknown,
  currency = 'ZMW'
) {
  const numeric =
    Number(value)

  if (!Number.isFinite(numeric)) {
    return String(
      value || ''
    )
  }

  const amount =
    numeric.toLocaleString(
      'en-ZM',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    )

  return currency === 'ZMW'
    ? `K${amount}`
    : `${currency} ${amount}`
}

function OrderContextCard({
  message,
}: {
  message: ChatMessage
}) {
  const snapshot =
    getContextSnapshot(
      message
    )

  if (!snapshot) {
    return null
  }

  const orderNumber =
    String(
      snapshot.orderNumber ||
      snapshot.orderId ||
      'Order'
    )

  const statusLabel =
    String(
      snapshot.statusLabel ||
      snapshot.status ||
      ''
    )

  const storeName =
    String(
      snapshot.sellerStoreName ||
      'Marketplace seller'
    )

  const currency =
    String(
      snapshot.currency ||
      'ZMW'
    )

  const storeTotal =
    snapshot.storeTotal !==
      undefined &&
    snapshot.storeTotal !==
      null
      ? formatOrderAmount(
          snapshot.storeTotal,
          currency
        )
      : ''

  const rawItems =
    Array.isArray(
      snapshot.items
    )
      ? snapshot.items
      : []

  const items =
    rawItems
      .map(entry => {
        const row =
          entry &&
          typeof entry ===
            'object'
            ? entry as
                Record<
                  string,
                  unknown
                >
            : {}

        return {
          id:
            String(
              row.id || ''
            ),

          productId:
            String(
              row.productId ||
              row.product_id ||
              row.id ||
              ''
            ),

          name:
            String(
              row.name ||
              'Order item'
            ),

          quantity:
            Number(
              row.quantity ||
              0
            ),

          imageUrl:
            String(
              row.imageUrl ||
              ''
            )
        }
      })
      .filter(
        item =>
          Boolean(item.id)
      )

  return (
    <div className="mb-1 overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm">
      <div className="border-b border-slate-100 p-2">
        <div className="flex items-start gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-dh-secondary/15 text-dh-primary">
            <PackageCheck className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-wide text-dh-secondary">
              Order inquiry
            </p>

            <p className="truncate text-xs font-black text-dh-primary">
              Order #{orderNumber}
            </p>

            <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500">
              {storeName}
            </p>
          </div>

          {statusLabel && (
            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">
              {statusLabel}
            </span>
          )}
        </div>
      </div>

      {items.length > 0 && (
        <div className="divide-y divide-slate-100">
          {items
            .slice(0, 2)
            .map(item => (
              <Link
                key={item.id}
                to={`/product/${encodeURIComponent(item.productId)}`}
                className="flex items-center gap-2 px-2 py-1.5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                  {item.imageUrl ? (
                    <img
                      src={
                        item.imageUrl
                      }
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <PackageCheck className="h-4 w-4 text-dh-primary" />
                  )}
                </div>

                <p className="min-w-0 flex-1 truncate text-xs font-bold text-dh-primary">
                  {item.name}
                </p>

                <span className="shrink-0 text-[10px] font-bold text-slate-500">
                  Qty {item.quantity}
                </span>
              </Link>
            ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 bg-slate-50 px-3 py-2">
        <span className="text-[10px] font-bold text-slate-500">
          {items.length}
          {' '}
          {items.length === 1
            ? 'item'
            : 'items'}
        </span>

        {storeTotal && (
          <span className="text-xs font-black text-dh-primary">
            {storeTotal}
          </span>
        )}
      </div>
    </div>
  )
}

function mergeChatMessages(
  current: ChatMessage[],
  incoming: ChatMessage[]
) {
  const incomingClientIds = new Set(
    incoming.map((message) => message.clientMessageId).filter(Boolean)
  )
  const bySequence = new Map<number, ChatMessage>()

  for (const message of current) {
    if (message.clientMessageId && incomingClientIds.has(message.clientMessageId)) {
      continue
    }
    bySequence.set(
      message.sequence,
      message
    )
  }

  for (const message of incoming) {
    bySequence.set(
      message.sequence,
      message
    )
  }

  return Array.from(
    bySequence.values()
  ).sort(
    (left, right) =>
      left.sequence -
      right.sequence
  )
}

function getChatMessageId(
  message: ChatMessage
) {
  return (
    message.messageId ||
    message.id ||
    ''
  )
}

export default function AccountMessagesPage() {
  const {
    conversationId
  } = useParams<{
    conversationId?: string
  }>()

  const location =
    useLocation()

  const navigate =
    useNavigate()

  const [
    conversations,
    setConversations
  ] = useState<
    ChatInboxItem[]
  >([])

  const [
    messages,
    setMessages
  ] = useState<
    ChatMessage[]
  >([])

  const [selectedChatImage, setSelectedChatImage] = useState<ChatAttachment | null>(null)

  const [
    query,
    setQuery
  ] = useState('')

  const [
    isLoadingInbox,
    setIsLoadingInbox
  ] = useState(true)

  const [
    isLoadingMessages,
    setIsLoadingMessages
  ] = useState(false)

  const [
    isSending,
    setIsSending
  ] = useState(false)

  const [
    pendingMediaItems,
    setPendingMediaItems
  ] = useState<PendingMediaItem[]>([])

  const [outgoingMediaItems, setOutgoingMediaItems] = useState<OutgoingMediaItem[]>([])

  const isSendingMedia = false

  const [
    isMediaBatchInConversation,
    setIsMediaBatchInConversation
  ] = useState(false)

  const [isPreparingMedia, setIsPreparingMedia] = useState(false)

  const [
    isSendingProduct,
    setIsSendingProduct
  ] = useState(false)

  const [
    pendingProduct,
    setPendingProduct
  ] = useState<
    PendingProductIntent | null
  >(null)

  const [
    isSendingOrder,
    setIsSendingOrder
  ] = useState(false)

  const [
    pendingOrder,
    setPendingOrder
  ] = useState<
    PendingOrderIntent | null
  >(null)

  const [
    isLoadingOlder,
    setIsLoadingOlder
  ] = useState(false)

  const [
    hasOlderMessages,
    setHasOlderMessages
  ] = useState(false)

  const [
    showScrollToBottom,
    setShowScrollToBottom
  ] = useState(false)

  const [
    draft,
    setDraft
  ] = useState('')

  const [
    replyingTo,
    setReplyingTo
  ] = useState<ChatMessage | null>(
    null
  )

  const [
    editingMessage,
    setEditingMessage
  ] = useState<ChatMessage | null>(
    null
  )

  const [
    mutationMessageId,
    setMutationMessageId
  ] = useState<string | null>(
    null
  )

  const [
    error,
    setError
  ] = useState('')

  const [
    messageClock,
    setMessageClock
  ] = useState(() => Date.now())

  const [
    connectionState,
    setConnectionState
  ] = useState<
    'connecting' |
    'connected' |
    'reconnecting' |
    'offline'
  >('connecting')

  useEffect(() => {
    const timer = window.setInterval(
      () => setMessageClock(Date.now()),
      10_000
    )

    return () => window.clearInterval(timer)
  }, [])

  const [
    counterpartyReceipt,
    setCounterpartyReceipt
  ] = useState<ChatReceiptSummary>({
    deliveredSequence: 0,
    readSequence: 0
  })

  const [
    sellerOnline,
    setSellerOnline
  ] = useState<boolean | null>(
    null
  )

  const [
    sellerTyping,
    setSellerTyping
  ] = useState(false)

  const activeConversationRef =
    useRef<string | undefined>(
      conversationId
    )

  const latestSequenceRef =
    useRef(0)

  const syncInFlightRef = useRef(new Set<string>())
  const optimisticSequenceRef = useRef(0)

  const socketRef =
    useRef<Socket | null>(
      null
    )

  const joinedConversationRef =
    useRef<string | null>(
      null
    )

  const joinAttemptRef =
    useRef(0)

  const messageScrollRef =
    useRef<HTMLDivElement | null>(
      null
    )

  const mediaInputRef =
    useRef<HTMLInputElement | null>(null)

  const pendingMediaItemsRef = useRef<PendingMediaItem[]>([])
  const outgoingMediaItemsRef = useRef<OutgoingMediaItem[]>([])

  useEffect(() => {
    pendingMediaItemsRef.current = pendingMediaItems
  }, [pendingMediaItems])

  useEffect(() => {
    outgoingMediaItemsRef.current = outgoingMediaItems
  }, [outgoingMediaItems])

  useEffect(() => {
    return () => {
      pendingMediaItemsRef.current.forEach(item => URL.revokeObjectURL(item.previewUrl))
      outgoingMediaItemsRef.current.forEach(item => URL.revokeObjectURL(item.previewUrl))
    }
  }, [])

  useEffect(() => {
    const deliveredIds = new Set(messages.map((message) => message.clientMessageId).filter(Boolean))
    if (deliveredIds.size === 0) return

    const cleanupTimer = window.setTimeout(() => {
      setOutgoingMediaItems((current) => current.filter((item) => {
        if (!deliveredIds.has(item.clientMessageId)) return true
        URL.revokeObjectURL(item.previewUrl)
        return false
      }))
    }, 0)

    return () => window.clearTimeout(cleanupTimer)
  }, [messages])

  const loadingOlderRef =
    useRef(false)

  const isNearBottomRef =
    useRef(true)

  const scrollToBottomRef =
    useRef(false)

  const preserveScrollRef =
    useRef<{
      scrollHeight: number
      scrollTop: number
    } | null>(
      null
    )

  const messageEndRef =
    useRef<HTMLDivElement | null>(
      null
    )

  const selectedConversation =
    useMemo(
      () =>
        conversations.find(
          item =>
            item.conversationId ===
            conversationId
        ),
      [
        conversations,
        conversationId
      ]
    )

  const filteredConversations =
    useMemo(
      () => {
        const needle =
          query
            .trim()
            .toLowerCase()

        if (!needle) {
          return conversations
        }

        return conversations.filter(
          item =>
            [
              getConversationTitle(
                item
              ),
              item.storeName,
              item.sellerStoreName,
              item.counterpartyName,
              item.counterparty
                ?.displayName,
              item.preview,
              item.latestMessagePreview,
              item.storeId,
              item.status
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()
              .includes(needle)
        )
      },
      [
        conversations,
        query
      ]
    )

  const latestSequence =
    useMemo(
      () =>
        messages.reduce(
          (
            highest,
            message
          ) =>
            Math.max(
              highest,
              message.sequence
            ),
          0
        ),
      [messages]
    )

  const messagesById =
    useMemo(
      () => {
        const byId =
          new Map<
            string,
            ChatMessage
          >()

        for (
          const message
          of messages
        ) {
          const messageId =
            getChatMessageId(
              message
            )

          if (messageId) {
            byId.set(
              messageId,
              message
            )
          }
        }

        return byId
      },
      [messages]
    )

  useEffect(
    () => {
      setReplyingTo(null)
      setEditingMessage(null)
      setMutationMessageId(null)
      setDraft('')
      pendingMediaItemsRef.current.forEach(item => URL.revokeObjectURL(item.previewUrl))
      setPendingMediaItems([])
      setIsMediaBatchInConversation(false)

      if (mediaInputRef.current) {
        mediaInputRef.current.value = ''
      }
    },
    [conversationId]
  )

  const loadInbox =
    useCallback(
      async () => {
        try {
          const response =
            await getBuyerInbox(
              100
            )

          setConversations(
            response.conversations
          )
        } catch (
          requestError
        ) {
          setError(
            requestError
              instanceof Error
              ? requestError.message
              : 'Unable to load messages.'
          )
        } finally {
          setIsLoadingInbox(
            false
          )
        }
      },
      []
    )

  const loadConversation =
    useCallback(
      async (
        targetConversationId:
          string
      ) => {
        setIsLoadingMessages(
          true
        )

        setError('')

        try {
          const response =
            await getBuyerMessages(
              targetConversationId,
              {
                limit: 50
              }
            )

          if (
            activeConversationRef.current !==
            targetConversationId
          ) {
            return
          }

          setCounterpartyReceipt(
            response.counterpartyReceipt || {
              deliveredSequence: 0,
              readSequence: 0
            }
          )

          setHasOlderMessages(
            response.page.hasMore &&
            (
              response.page
                .firstSequence ||
              0
            ) > 1
          )

          isNearBottomRef.current =
            true

          scrollToBottomRef.current =
            true

          setShowScrollToBottom(
            false
          )

          setMessages((current) => mergeChatMessages(current, response.messages))

          const latest =
            response.messages.reduce(
              (
                highest,
                message
              ) =>
                Math.max(
                  highest,
                  message.sequence
                ),
              0
            )

          latestSequenceRef.current =
            latest

          if (latest > 0) {
            await Promise.allSettled([
              markBuyerDelivered(
                targetConversationId,
                latest
              ),

              markBuyerRead(
                targetConversationId,
                latest
              )
            ])
          }
        } catch (
          requestError
        ) {
          setError(
            requestError
              instanceof Error
              ? requestError.message
              : 'Unable to load this conversation.'
          )
        } finally {
          if (
            activeConversationRef.current ===
              targetConversationId
          ) {
            setIsLoadingMessages(
              false
            )
          }
        }
      },
      []
    )

  const loadOlderMessages =
    useCallback(
      async () => {
        if (
          !conversationId ||
          !hasOlderMessages ||
          loadingOlderRef.current
        ) {
          return
        }

        const firstSequence =
          messages[0]?.sequence

        if (!firstSequence) {
          setHasOlderMessages(
            false
          )

          return
        }

        loadingOlderRef.current =
          true

        setIsLoadingOlder(
          true
        )

        try {
          const response =
            await getBuyerMessages(
              conversationId,
              {
                limit: 50,
                beforeSequence:
                  firstSequence
              }
            )

          if (
            activeConversationRef.current !==
              conversationId
          ) {
            return
          }

          setCounterpartyReceipt(
            response.counterpartyReceipt || {
              deliveredSequence: 0,
              readSequence: 0
            }
          )

          if (
            response.messages.length ===
              0
          ) {
            setHasOlderMessages(
              false
            )

            return
          }

          const scrollContainer =
            messageScrollRef.current

          if (scrollContainer) {
            preserveScrollRef.current = {
              scrollHeight:
                scrollContainer
                  .scrollHeight,

              scrollTop:
                scrollContainer
                  .scrollTop
            }
          }

          setHasOlderMessages(
            response.page.hasMore &&
            (
              response.page
                .firstSequence ||
              0
            ) > 1
          )

          setMessages(
            current =>
              mergeChatMessages(
                response.messages,
                current
              )
          )
        } catch (
          requestError
        ) {
          console.error(
            '[buyer-chat] older history load failed',
            requestError
          )
        } finally {
          loadingOlderRef.current =
            false

          if (
            activeConversationRef.current ===
              conversationId
          ) {
            setIsLoadingOlder(
              false
            )
          }
        }
      },
      [
        conversationId,
        hasOlderMessages,
        messages
      ]
    )

  const syncConversation =
    useCallback(
      async (
        targetConversationId: string
      ) => {
        if (syncInFlightRef.current.has(targetConversationId)) return
        syncInFlightRef.current.add(targetConversationId)

        let cursor =
          latestSequenceRef.current

        let acknowledgedSequence =
          cursor

        try {
          for (
            let batch = 0;
            batch < 20;
            batch += 1
          ) {
            const response =
              await getBuyerMessages(
                targetConversationId,
                {
                  limit: 100,
                  afterSequence:
                    cursor
                }
              )

            if (
              activeConversationRef.current !==
              targetConversationId
            ) {
              return
            }

            setCounterpartyReceipt(
              response.counterpartyReceipt || {
                deliveredSequence: 0,
                readSequence: 0
              }
            )

            if (
              response.messages.length ===
              0
            ) {
              break
            }

            if (
              isNearBottomRef.current
            ) {
              scrollToBottomRef.current =
                true
            } else {
              setShowScrollToBottom(
                true
              )
            }

            setMessages(
              current =>
                mergeChatMessages(
                  current,
                  response.messages
                )
            )

            const newest =
              response.messages.reduce(
                (
                  highest,
                  message
                ) =>
                  Math.max(
                    highest,
                    message.sequence
                  ),
                cursor
              )

            cursor =
              newest

            acknowledgedSequence =
              Math.max(
                acknowledgedSequence,
                newest
              )

            latestSequenceRef.current =
              Math.max(
                latestSequenceRef.current,
                newest
              )

            if (
              response.messages.length <
              100
            ) {
              break
            }
          }

          if (
            acknowledgedSequence > 0
          ) {
            await Promise.allSettled([
              markBuyerDelivered(
                targetConversationId,
                acknowledgedSequence
              )
            ])
          }
        } catch (
          requestError
        ) {
          console.error(
            '[buyer-chat] realtime sync failed',
            requestError
          )
        } finally {
          syncInFlightRef.current.delete(targetConversationId)
        }
      },
      []
    )

  const refreshChangedMessage =
    useCallback(
      async (
        targetConversationId: string,
        sequence: number
      ) => {
        if (
          !Number.isSafeInteger(sequence) ||
          sequence < 1
        ) {
          return
        }

        try {
          const response =
            await getBuyerMessages(
              targetConversationId,
              {
                limit: 1,
                afterSequence:
                  Math.max(
                    0,
                    sequence - 1
                  )
              }
            )

          if (
            activeConversationRef.current !==
              targetConversationId
          ) {
            return
          }

          const changedMessage =
            response.messages.find(
              message =>
                message.sequence ===
                sequence
            )

          if (!changedMessage) {
            return
          }

          setMessages(
            current =>
              mergeChatMessages(
                current,
                [changedMessage]
              )
          )
        } catch (
          requestError
        ) {
          console.error(
            '[buyer-chat] mutation refresh failed',
            requestError
          )
        }
      },
      []
    )

  useEffect(() => {
    if (!conversationId) return

    const refreshVisibleConversation = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void syncConversation(conversationId)
      }
    }

    const pollTimer = window.setInterval(refreshVisibleConversation, 4_000)
    window.addEventListener('focus', refreshVisibleConversation)
    window.addEventListener('online', refreshVisibleConversation)
    document.addEventListener('visibilitychange', refreshVisibleConversation)

    return () => {
      window.clearInterval(pollTimer)
      window.removeEventListener('focus', refreshVisibleConversation)
      window.removeEventListener('online', refreshVisibleConversation)
      document.removeEventListener('visibilitychange', refreshVisibleConversation)
    }
  }, [conversationId, syncConversation])

  useEffect(
    () => {
      const state =
        location.state as {
          pendingProduct?:
            ChatProductIntent

          pendingOrder?:
            ChatOrderIntent
        } | null

      const product =
        state?.pendingProduct

      const order =
        state?.pendingOrder

      if (
        !conversationId ||
        (!product?.id &&
          !order?.id)
      ) {
        return
      }

      if (product?.id) {
        setPendingProduct({
          ...product,

          conversationId,

          clientMessageId:
            window.crypto
              .randomUUID()
        })

        setPendingOrder(null)
      } else if (order?.id) {
        setPendingOrder({
          ...order,

          conversationId,

          clientMessageId:
            window.crypto
              .randomUUID()
        })

        setPendingProduct(null)
      }

      navigate(
        location.pathname +
          location.search,
        {
          replace: true,
          state: null
        }
      )
    },
    [
      conversationId,
      location.pathname,
      location.search,
      location.state,
      navigate
    ]
  )

  useEffect(
    () => {
      if (
        !getAccountToken()
      ) {
        const redirect =
          location.pathname +
          location.search

        navigate(
          `/login?redirect=${encodeURIComponent(
            redirect
          )}`,
          {
            replace: true
          }
        )

        return
      }

      void loadInbox()
    },
    [
      loadInbox,
      location.pathname,
      location.search,
      navigate
    ]
  )

  useEffect(
    () => {
      activeConversationRef.current =
        conversationId

      latestSequenceRef.current =
        0

      setCounterpartyReceipt({
        deliveredSequence: 0,
        readSequence: 0
      })

      setSellerOnline(null)
      setSellerTyping(false)

      loadingOlderRef.current =
        false

      preserveScrollRef.current =
        null

      scrollToBottomRef.current =
        false

      isNearBottomRef.current =
        true

      setIsLoadingOlder(false)
      setHasOlderMessages(false)
      setShowScrollToBottom(false)
      setIsSendingProduct(false)
      setIsSendingOrder(false)

      setPendingProduct(
        current =>
          current?.conversationId ===
            conversationId
            ? current
            : null
      )

      setPendingOrder(
        current =>
          current?.conversationId ===
            conversationId
            ? current
            : null
      )

      setMessages([])

      if (!conversationId) {
        return
      }

      void loadConversation(
        conversationId
      )
    },
    [
      conversationId,
      loadConversation
    ]
  )

  useEffect(
    () => {
      if (
        !getAccountToken()
      ) {
        return
      }

      setConnectionState(
        'connecting'
      )

      try {
        const socket =
          createBuyerChatSocket()

        socketRef.current =
          socket

        const handleConnect =
          () => {
            setConnectionState(
              'connected'
            )

            const activeConversation =
              activeConversationRef.current

            joinedConversationRef.current =
              null

            const joinAttempt =
              ++joinAttemptRef.current

            if (
              activeConversation
            ) {
              socket.emit(
                'conversation:join',
                {
                  conversationId:
                    activeConversation
                },
                (
                  response: unknown
                ) => {
                  const ack =
                    response &&
                    typeof response ===
                      'object'
                      ? response as
                          Record<
                            string,
                            unknown
                          >
                      : null

                  if (
                    joinAttemptRef.current !==
                      joinAttempt ||
                    !socket.connected ||
                    activeConversationRef
                      .current !==
                      activeConversation
                  ) {
                    return
                  }

                  if (
                    ack?.ok !== true ||
                    String(
                      ack.conversationId ||
                      ''
                    ) !==
                      activeConversation
                  ) {
                    joinedConversationRef
                      .current =
                        null

                    return
                  }

                  joinedConversationRef
                    .current =
                      activeConversation

                  void syncConversation(
                    activeConversation
                  )
                }
              )
            }

            void loadInbox()
          }

        const handleDisconnect =
          () => {
            joinAttemptRef.current += 1

            joinedConversationRef.current =
              null

            setSellerOnline(null)
            setSellerTyping(false)

            setConnectionState(
              navigator.onLine
                ? 'reconnecting'
                : 'offline'
            )
          }

        const handleConnectError =
          () => {
            setConnectionState(
              navigator.onLine
                ? 'reconnecting'
                : 'offline'
            )
          }

        const handleReconnectAttempt =
          () => {
            setConnectionState(
              navigator.onLine
                ? 'reconnecting'
                : 'offline'
            )
          }

        const handleConversationChanged =
          () => {
            void loadInbox()
          }

        const handleMessageAvailable =
          (
            event: {
              conversationId?: string
              sequence?: number
            }
          ) => {
            void loadInbox()

            const activeConversation =
              activeConversationRef.current

            if (
              event.conversationId &&
              activeConversation &&
              event.conversationId ===
                activeConversation
            ) {
              void syncConversation(
                activeConversation
              )
            }
          }

        const handleMessageChanged =
          (
            event: {
              conversationId?: string
              sequence?: number
              change?:
                | 'edited'
                | 'deleted'
            }
          ) => {
            void loadInbox()

            const activeConversation =
              activeConversationRef.current

            const sequence =
              Number(
                event.sequence || 0
              )

            if (
              event.conversationId &&
              activeConversation &&
              event.conversationId ===
                activeConversation &&
              Number.isSafeInteger(
                sequence
              ) &&
              sequence > 0
            ) {
              void refreshChangedMessage(
                activeConversation,
                sequence
              )
            }
          }

        const handleReceiptUpdated =
          (
            event: {
              conversationId?: string
              actorType?: string
              deliveredSequence?: number
              readSequence?: number
            }
          ) => {
            if (
              event.conversationId !==
                activeConversationRef.current ||
              event.actorType !==
                'seller'
            ) {
              return
            }

            const deliveredSequence =
              Number(
                event.deliveredSequence ||
                0
              )

            const readSequence =
              Number(
                event.readSequence ||
                0
              )

            setCounterpartyReceipt(
              current => ({
                deliveredSequence:
                  Math.max(
                    current.deliveredSequence,
                    deliveredSequence
                  ),

                readSequence:
                  Math.max(
                    current.readSequence,
                    readSequence
                  )
              })
            )
          }

        const handleTypingUpdated =
          (
            event: {
              conversationId?: string
              actorType?: string
              isTyping?: boolean
            }
          ) => {
            if (
              event.conversationId !==
                activeConversationRef.current ||
              event.actorType !==
                'seller'
            ) {
              return
            }

            setSellerTyping(
              event.isTyping === true
            )
          }

        const handlePresenceUpdated =
          (
            event: {
              conversationId?: string
              actorType?: string
              online?: boolean
            }
          ) => {
            if (
              event.conversationId !==
                activeConversationRef.current ||
              event.actorType !==
                'seller'
            ) {
              return
            }

            setSellerOnline(
              event.online === true
            )

            if (
              event.online !== true
            ) {
              setSellerTyping(false)

              void loadInbox()
            }
          }

        const handleOffline =
          () => {
            setSellerOnline(null)
            setSellerTyping(false)
            setConnectionState(
              'offline'
            )
          }

        const handleOnline =
          () => {
            if (
              !socket.connected
            ) {
              setConnectionState(
                'reconnecting'
              )

              socket.connect()
            }
          }

        socket.on(
          'connect',
          handleConnect
        )

        socket.on(
          'disconnect',
          handleDisconnect
        )

        socket.on(
          'connect_error',
          handleConnectError
        )

        socket.on(
          'conversation:changed',
          handleConversationChanged
        )

        socket.on(
          'message:available',
          handleMessageAvailable
        )

        socket.on(
          'message:changed',
          handleMessageChanged
        )

        socket.on(
          'receipt:updated',
          handleReceiptUpdated
        )

        socket.on(
          'typing:updated',
          handleTypingUpdated
        )

        socket.on(
          'presence:updated',
          handlePresenceUpdated
        )

        socket.io.on(
          'reconnect_attempt',
          handleReconnectAttempt
        )

        window.addEventListener(
          'offline',
          handleOffline
        )

        window.addEventListener(
          'online',
          handleOnline
        )

        socket.connect()

        return () => {
          window.removeEventListener(
            'offline',
            handleOffline
          )

          window.removeEventListener(
            'online',
            handleOnline
          )

          socket.io.off(
            'reconnect_attempt',
            handleReconnectAttempt
          )

          socket.removeAllListeners()
          socket.disconnect()

          if (
            socketRef.current ===
            socket
          ) {
            socketRef.current =
              null
          }
        }
      } catch (
        connectionError
      ) {
        setConnectionState(
          navigator.onLine
            ? 'reconnecting'
            : 'offline'
        )

        console.error(
          '[buyer-chat] realtime connection failed',
          connectionError
        )
      }
    },
    [
      loadInbox,
      refreshChangedMessage,
      syncConversation
    ]
  )

  useEffect(
    () => {
      const socket =
        socketRef.current

      if (
        !socket ||
        !conversationId ||
        !socket.connected
      ) {
        return
      }

      joinedConversationRef.current =
        null

      const joinAttempt =
        ++joinAttemptRef.current

      socket.emit(
        'conversation:join',
        {
          conversationId
        },
        (
          response: unknown
        ) => {
          const ack =
            response &&
            typeof response ===
              'object'
              ? response as
                  Record<
                    string,
                    unknown
                  >
              : null

          if (
            joinAttemptRef.current !==
              joinAttempt ||
            !socket.connected ||
            activeConversationRef
              .current !==
              conversationId
          ) {
            return
          }

          if (
            ack?.ok === true &&
            String(
              ack.conversationId ||
              ''
            ) ===
              conversationId
          ) {
            joinedConversationRef
              .current =
                conversationId
          }
        }
      )

      return () => {
        if (
          joinAttemptRef.current ===
            joinAttempt
        ) {
          joinAttemptRef.current += 1
        }

        if (
          joinedConversationRef
            .current ===
              conversationId
        ) {
          socket.emit(
            'typing:stop',
            {
              conversationId
            }
          )

          joinedConversationRef.current =
            null
        }

        if (
          socket.connected
        ) {
          socket.emit(
            'conversation:leave',
            {
              conversationId
            }
          )
        }
      }
    },
    [conversationId]
  )

  const markVisibleMessagesRead =
    useCallback(
      () => {
        const activeConversation =
          activeConversationRef.current

        const latest =
          latestSequenceRef.current

        if (
          !activeConversation ||
          latest < 1
        ) {
          return
        }

        void markBuyerRead(
          activeConversation,
          latest
        ).then(
          () =>
            loadInbox()
        ).catch(
          () => undefined
        )
      },
      [
        loadInbox
      ]
    )

  useLayoutEffect(
    () => {
      const container =
        messageScrollRef.current

      /*
       * Initial history may be populated before
       * receipt acknowledgement finishes.
       *
       * Keep the pending scroll-to-bottom flag
       * until the real message list replaces the
       * loading placeholder.
       */
      if (
        !container ||
        isLoadingMessages
      ) {
        return
      }

      const preserved =
        preserveScrollRef.current

      if (preserved) {
        const addedHeight =
          container.scrollHeight -
          preserved.scrollHeight

        container.scrollTop =
          preserved.scrollTop +
          addedHeight

        preserveScrollRef.current =
          null

        return
      }

      if (
        scrollToBottomRef.current
      ) {
        container.scrollTop =
          container.scrollHeight

        scrollToBottomRef.current =
          false

        isNearBottomRef.current =
          true

        setShowScrollToBottom(
          false
        )
      }
    },
    [
      messages,
      isLoadingMessages
    ]
  )

  const scrollToLatest =
    useCallback(
      () => {
        const container =
          messageScrollRef.current

        if (!container) {
          return
        }

        container.scrollTo({
          top:
            container.scrollHeight,
          behavior:
            'smooth'
        })

        isNearBottomRef.current =
          true

        setShowScrollToBottom(
          false
        )

        markVisibleMessagesRead()
      },
      [
        markVisibleMessagesRead
      ]
    )

  useEffect(
    () => {
      if (
        !conversationId ||
        latestSequence < 1 ||
        !isNearBottomRef.current
      ) {
        return
      }

      markVisibleMessagesRead()
    },
    [
      conversationId,
      latestSequence,
      markVisibleMessagesRead
    ]
  )

  function clearPendingMedia() {
    pendingMediaItemsRef.current.forEach(item => URL.revokeObjectURL(item.previewUrl))
    setPendingMediaItems([])
    setIsMediaBatchInConversation(false)

    if (mediaInputRef.current) {
      mediaInputRef.current.value = ''
    }
  }

  async function handleMediaSelection(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selectedFiles = Array.from(event.target.files || [])
    if (!selectedFiles.length) return
    if (selectedFiles.length > CHAT_MEDIA_BATCH_LIMIT) {
      setError(`Choose up to ${CHAT_MEDIA_BATCH_LIMIT} photos or videos at a time.`)
      event.target.value = ''
      return
    }

    const validationError = selectedFiles.map(validateChatMediaInput).find(Boolean)

    if (validationError) {
      setError(validationError)
      event.target.value = ''
      return
    }

    setError('')
    setEditingMessage(null)
    setDraft('')
    setIsPreparingMedia(true)

    if (joinedConversationRef.current === conversationId) {
      socketRef.current?.emit('typing:stop', { conversationId })
    }

    try {
      clearPendingMedia()
      const prepared = await Promise.all(
        selectedFiles.map(async original => {
          const file = await prepareChatMediaFile(original)
          return {
            id: crypto.randomUUID(),
            file,
            previewUrl: URL.createObjectURL(file),
            originalSize: original.size,
            progress: 0,
            status: 'ready' as const,
          }
        })
      )
      setPendingMediaItems(prepared)
    } catch (selectionError) {
      setError(selectionError instanceof Error ? selectionError.message : 'Unable to prepare the selected media.')
    } finally {
      setIsPreparingMedia(false)
      event.target.value = ''
    }
  }

  function removePendingMedia(id: string) {
    setPendingMediaItems(current => {
      const item = current.find(candidate => candidate.id === id)
      if (item) URL.revokeObjectURL(item.previewUrl)
      return current.filter(candidate => candidate.id !== id)
    })
  }

  function removeOutgoingMedia(clientMessageId: string) {
    setOutgoingMediaItems((current) => {
      const item = current.find((candidate) => candidate.clientMessageId === clientMessageId)
      if (item) URL.revokeObjectURL(item.previewUrl)
      return current.filter((candidate) => candidate.clientMessageId !== clientMessageId)
    })
  }

  async function uploadOutgoingMedia(item: OutgoingMediaItem) {
    setOutgoingMediaItems((current) => current.map((candidate) =>
      candidate.clientMessageId === item.clientMessageId
        ? { ...candidate, status: 'uploading', progress: 0, error: undefined }
        : candidate
    ))

    try {
      await sendBuyerMedia(
        item.conversationId,
        item.file,
        (progress) => setOutgoingMediaItems((current) => current.map((candidate) =>
          candidate.clientMessageId === item.clientMessageId
            ? { ...candidate, progress }
            : candidate
        )),
        item.replyToMessageId,
        item.clientMessageId
      )

      setOutgoingMediaItems((current) => current.map((candidate) =>
        candidate.clientMessageId === item.clientMessageId
          ? { ...candidate, status: 'sent', progress: 100 }
          : candidate
      ))
      await Promise.allSettled([syncConversation(item.conversationId), loadInbox()])
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Unable to send this media.'
      setOutgoingMediaItems((current) => current.map((candidate) =>
        candidate.clientMessageId === item.clientMessageId
          ? { ...candidate, status: 'error', error: message }
          : candidate
      ))
    }
  }

  function handleSendMedia() {
    if (
      !conversationId ||
      pendingMediaItems.length === 0 ||
      mutationMessageId
    ) {
      return
    }

    setError('')
    const replyToMessageId = replyingTo ? getChatMessageId(replyingTo) || undefined : undefined
    const batch: OutgoingMediaItem[] = pendingMediaItems.map((item) => ({
      ...item,
      conversationId,
      clientMessageId: window.crypto.randomUUID(),
      replyToMessageId,
      status: 'uploading',
      progress: 0,
    }))

    setPendingMediaItems([])
    setIsMediaBatchInConversation(false)
    setReplyingTo(null)
    setOutgoingMediaItems((current) => [...current, ...batch])
    requestAnimationFrame(scrollToLatest)
    batch.forEach((item) => void uploadOutgoingMedia(item))
  }

  async function handleSend(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault()

    const text =
      draft.trim()

    if (
      !conversationId ||
      !text ||
      mutationMessageId
    ) {
      return
    }
    setError('')

    if (
      joinedConversationRef.current ===
        conversationId
    ) {
      socketRef.current?.emit(
        'typing:stop',
        {
          conversationId
        }
      )
    }

    if (editingMessage) {
      if (isSending) return
      setIsSending(true)

      try {
        const messageId =
          getChatMessageId(
            editingMessage
          )

        if (!messageId) {
          throw new Error(
            'This message cannot be edited.'
          )
        }

        await editBuyerMessage(
          conversationId,
          messageId,
          text
        )

        await refreshChangedMessage(
          conversationId,
          editingMessage.sequence
        )

        setEditingMessage(null)
        setDraft('')
        await loadInbox()
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'Unable to edit your message.')
      } finally {
        setIsSending(false)
      }
      return
    }

    const replyToMessageId = replyingTo ? getChatMessageId(replyingTo) : ''
    const clientMessageId = window.crypto.randomUUID()
    const optimisticMessage: ChatMessage = {
      messageId: `local:${clientMessageId}`,
      id: `local:${clientMessageId}`,
      clientMessageId,
      conversationId,
      sequence: latestSequenceRef.current + (++optimisticSequenceRef.current / 1000),
      messageType: 'text',
      type: 'text',
      text,
      replyToMessageId: replyToMessageId || null,
      sender: { type: 'buyer', id: 'current-buyer', displayName: 'You' },
      attachments: [],
      contexts: [],
      createdAt: new Date().toISOString(),
      localStatus: 'sending',
    }

    setDraft('')
    setReplyingTo(null)
    scrollToBottomRef.current = true
    setMessages((current) => mergeChatMessages(current, [optimisticMessage]))

    try {
      await sendBuyerMessage(
        conversationId,
        text,
        replyToMessageId || undefined,
        clientMessageId
      )
      await Promise.allSettled([syncConversation(conversationId), loadInbox()])
    } catch (requestError) {
      setMessages((current) => current.map((message) =>
        message.clientMessageId === clientMessageId
          ? { ...message, localStatus: 'failed' }
          : message
      ))
      setError(requestError instanceof Error ? requestError.message : 'Unable to send your message.')
    }
  }

  async function retryOptimisticMessage(message: ChatMessage) {
    if (!conversationId || !message.clientMessageId || !message.text) return

    setMessages((current) => current.map((candidate) =>
      candidate.clientMessageId === message.clientMessageId
        ? { ...candidate, localStatus: 'sending' }
        : candidate
    ))
    setError('')

    try {
      await sendBuyerMessage(
        conversationId,
        message.text,
        message.replyToMessageId || undefined,
        message.clientMessageId
      )
      await Promise.allSettled([syncConversation(conversationId), loadInbox()])
    } catch (requestError) {
      setMessages((current) => current.map((candidate) =>
        candidate.clientMessageId === message.clientMessageId
          ? { ...candidate, localStatus: 'failed' }
          : candidate
      ))
      setError(requestError instanceof Error ? requestError.message : 'Unable to retry this message.')
    }
  }

  function beginReply(
    message: ChatMessage
  ) {
    if (
      message.deleted ||
      !getChatMessageId(message)
    ) {
      return
    }

    setEditingMessage(null)
    setReplyingTo(message)
    setDraft('')
  }

  function beginEdit(
    message: ChatMessage
  ) {
    const messageKind =
      message.messageType ||
      message.type

    if (
      !canMutateMessage(
        message,
        Date.now()
      ) ||
      messageKind !== 'text'
    ) {
      return
    }

    setReplyingTo(null)
    clearPendingMedia()
    setEditingMessage(message)
    setDraft(
      message.text.slice(
        0,
        4000
      )
    )
  }

  async function handleDeleteMessage(
    message: ChatMessage
  ) {
    if (!conversationId) {
      return
    }

    const messageId =
      getChatMessageId(message)

    const messageKind =
      message.messageType ||
      message.type

    if (
      !messageId ||
      message.deleted ||
      message.sender?.type !==
        'buyer' ||
      !['text', 'image', 'video'].includes(messageKind || '') ||
      !canRecallMessage(
        message,
        Date.now()
      ) ||
      mutationMessageId
    ) {
      return
    }

    const confirmed =
      window.confirm(
        'Recall this message for everyone? Recall is available for 10 minutes after sending.'
      )

    if (!confirmed) {
      return
    }

    setMutationMessageId(
      messageId
    )
    setError('')

    try {
      await deleteBuyerMessage(
        conversationId,
        messageId
      )

      await Promise.all([
        refreshChangedMessage(
          conversationId,
          message.sequence
        ),
        loadInbox()
      ])

      if (
        editingMessage &&
        getChatMessageId(
          editingMessage
        ) === messageId
      ) {
        setEditingMessage(null)
        setDraft('')
      }

      if (
        replyingTo &&
        getChatMessageId(
          replyingTo
        ) === messageId
      ) {
        setReplyingTo(null)
      }
    } catch (
      requestError
    ) {
      setError(
        requestError
          instanceof Error
          ? requestError.message
          : 'Unable to recall this message.'
      )
    } finally {
      setMutationMessageId(null)
    }
  }

  async function handleSendProduct() {
    if (
      !conversationId ||
      !pendingProduct ||
      pendingProduct
        .conversationId !==
          conversationId ||
      isSendingProduct ||
      isSendingOrder ||
      isSendingMedia ||
      isSending
    ) {
      return
    }

    setIsSendingProduct(true)
    setError('')

    try {
      await sendBuyerProduct(
        conversationId,
        pendingProduct.id,
        pendingProduct.clientMessageId
      )

      setPendingProduct(null)

      await Promise.all([
        syncConversation(
          conversationId
        ),
        loadInbox()
      ])
    } catch (
      requestError
    ) {
      setError(
        requestError
          instanceof Error
          ? requestError.message
          : 'Unable to send this product.'
      )
    } finally {
      setIsSendingProduct(false)
    }
  }

  async function handleSendOrder() {
    if (
      !conversationId ||
      !pendingOrder ||
      pendingOrder
        .conversationId !==
          conversationId ||
      isSendingOrder ||
      isSendingProduct ||
      isSendingMedia ||
      isSending
    ) {
      return
    }

    setIsSendingOrder(true)
    setError('')

    try {
      await sendBuyerOrder(
        conversationId,
        pendingOrder.id,
        pendingOrder.clientMessageId
      )

      setPendingOrder(null)

      await Promise.all([
        syncConversation(
          conversationId
        ),
        loadInbox()
      ])
    } catch (
      requestError
    ) {
      setError(
        requestError
          instanceof Error
          ? requestError.message
          : 'Unable to send this order.'
      )
    } finally {
      setIsSendingOrder(false)
    }
  }

  return (
    <div className="flex min-h-[100svh] flex-col bg-dh-gray">
      <Header />

      <main className="py-1.5 lg:py-2">
        <div className="container mx-auto max-w-[1536px] px-3 sm:px-5 lg:px-6">
          <div className={`${conversationId ? 'hidden md:flex' : 'flex'} mb-1.5 flex-wrap items-center justify-between gap-2`}>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-dh-secondary sm:text-xs">
                DigitalHood Marketplace
              </p>

              <h1 className="font-display text-lg font-black leading-tight text-dh-primary sm:text-xl">
                Messages
              </h1>
            </div>

            <Link
              to="/account"
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-black text-dh-primary shadow-sm transition hover:bg-dh-primary hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              My account
            </Link>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700"
            >
              {error}
            </div>
          )}

          <div className="grid h-[calc(100dvh-7.25rem)] min-h-[440px] max-h-[1100px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg md:h-[calc(100dvh-10.5rem)] md:grid-cols-[280px_minmax(0,1fr)] lg:h-[calc(100dvh-8rem)] xl:grid-cols-[310px_minmax(0,1fr)]">
            <aside
              className={`border-r border-slate-100 ${
                conversationId
                  ? 'hidden md:flex'
                  : 'flex'
              } flex-col`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
                <div>
                  <p className="font-display text-base font-black leading-tight text-dh-primary">
                    Conversations
                  </p>

                  <p className="text-[10px] font-semibold text-slate-400">
                    Buyers and marketplace stores
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsLoadingInbox(
                      true
                    )

                    void loadInbox()
                  }}
                  className="rounded-full bg-dh-gray p-1.5 text-dh-primary transition hover:bg-dh-secondary/20"
                  aria-label="Refresh messages"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              <div className="border-b border-slate-100 px-2.5 py-2">
                <label className="flex items-center gap-2 rounded-xl bg-dh-gray px-2.5 py-2">
                  <Search className="h-4 w-4 text-slate-400" />

                  <input
                    value={query}
                    onChange={event =>
                      setQuery(
                        event.target.value
                      )
                    }
                    type="search"
                    aria-label="Search conversations"
                    placeholder="Search conversations..."
                    className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-slate-700 outline-none placeholder:text-slate-400"
                  />
                </label>
              </div>

              <div className="flex-1 overflow-y-auto p-1.5">
                {isLoadingInbox ? (
                  <div
                    role="status"
                    aria-live="polite"
                    className="flex h-44 items-center justify-center"
                  >
                    <Loader2 className="h-7 w-7 animate-spin text-dh-primary" />
                    <span className="sr-only">
                      Loading conversations
                    </span>
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="p-6 text-center">
                    <MessageCircle className="mx-auto h-10 w-10 text-dh-primary" />

                    <p className="mt-3 font-black text-dh-primary">
                      {query.trim() &&
                      conversations.length > 0
                        ? 'No matching conversations'
                        : 'No conversations yet'}
                    </p>

                    <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                      {query.trim() &&
                      conversations.length > 0
                        ? 'Try another store name or message keyword.'
                        : 'Open a product and choose Chat to start a secure conversation with its seller.'}
                    </p>
                  </div>
                ) : (
                  filteredConversations.map(
                    item => {
                      const active =
                        item.conversationId ===
                        conversationId

                      return (
                        <button
                          key={
                            item.conversationId
                          }
                          type="button"
                          onClick={() =>
                            navigate(
                              `/account/messages/${item.conversationId}`
                            )
                          }
                          className={`mb-0.5 w-full rounded-xl px-2 py-1.5 text-left transition ${
                            active
                              ? 'bg-dh-primary text-white'
                              : 'hover:bg-dh-gray'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <ConversationAvatar
                              item={item}
                              size="xs"
                              online={
                                active &&
                                sellerOnline ===
                                  true
                              }
                            />

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-xs font-black leading-4">
                                  {getConversationTitle(
                                    item
                                  )}
                                </p>

                                {item.unreadCount >
                                  0 && (
                                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ffb54a] px-1.5 text-[10px] font-black text-[#26248c]">
                                    {item.unreadCount >
                                    99
                                      ? '99+'
                                      : item.unreadCount}
                                  </span>
                                )}
                              </div>

                              <p
                                className={`truncate text-[10px] font-semibold leading-3 ${
                                  active
                                    ? 'text-white/70'
                                    : 'text-slate-400'
                                }`}
                              >
                                {item.preview ||
                                  'Open conversation'}
                              </p>
                            </div>
                          </div>
                        </button>
                      )
                    }
                  )
                )}
              </div>
            </aside>

            <section
              className={`${
                conversationId
                  ? 'flex'
                  : 'hidden md:flex'
              } min-h-0 min-w-0 flex-col`}
            >
              {!conversationId ? (
                <div className="flex flex-1 items-center justify-center p-8 text-center">
                  <div>
                    <MessageCircle className="mx-auto h-14 w-14 text-dh-primary" />

                    <h2 className="mt-4 font-display text-2xl font-black text-dh-primary">
                      Select a conversation
                    </h2>

                    <p className="mt-2 max-w-md text-sm font-medium leading-6 text-slate-500">
                      Your DigitalHood marketplace conversations remain available here so you can continue where you left off.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <header className="flex items-center gap-2.5 border-b border-slate-100 px-3 py-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          '/account/messages'
                        )
                      }
                      className="rounded-full bg-dh-gray p-2 text-dh-primary md:hidden"
                      aria-label="Back to conversations"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>

                    <ConversationAvatar
                      item={
                        selectedConversation
                      }
                      online={
                        sellerOnline === true
                      }
                    />

                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-display text-base font-black text-dh-primary">
                        {getConversationTitle(
                          selectedConversation
                        )}
                      </h2>

                      <p className="text-xs font-semibold text-slate-500">
                        {sellerTyping
                          ? 'Seller is typing…'
                          : connectionState === 'connected'
                            ? sellerOnline === true
                              ? 'Online'
                              : sellerOnline === false
                                ? formatLastSeen(
                                    selectedConversation
                                      ?.counterparty
                                      ?.lastSeenAt
                                  )
                                : 'Connected'
                            : connectionState === 'reconnecting'
                              ? 'Reconnecting…'
                              : connectionState === 'offline'
                                ? 'Offline'
                                : 'Connecting…'}
                        {' · Marketplace conversation'}
                      </p>
                    </div>
                  </header>

                  <div className="relative min-h-0 flex-1">
                    <div
                      ref={messageScrollRef}
                      onScroll={event => {
                        const container =
                          event.currentTarget

                        const distanceFromBottom =
                          container.scrollHeight -
                          container.scrollTop -
                          container.clientHeight

                        const nearBottom =
                          distanceFromBottom <=
                          140

                        const wasNearBottom =
                          isNearBottomRef.current

                        isNearBottomRef.current =
                          nearBottom

                        if (nearBottom) {
                          setShowScrollToBottom(
                            false
                          )

                          if (!wasNearBottom) {
                            markVisibleMessagesRead()
                          }
                        }

                        if (
                          container.scrollTop <=
                            72 &&
                          hasOlderMessages &&
                          !loadingOlderRef.current
                        ) {
                          void loadOlderMessages()
                        }
                      }}
                      className="chat-wallpaper h-full overflow-y-auto p-2 sm:p-2.5"
                    >
                    {isLoadingMessages ? (
                      <div className="flex h-full min-h-64 items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-dh-primary" />
                      </div>
                    ) : messages.length ===
                      0 ? (
                      <div className="flex h-full min-h-64 items-center justify-center text-center">
                        <div>
                          <MessageCircle className="mx-auto h-10 w-10 text-dh-primary" />

                          <p className="mt-3 font-black text-dh-primary">
                            Start the conversation
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {messages.map(
                          (
                            message,
                            index
                          ) => {
                            const isBuyer =
                              message.sender
                                ?.type ===
                              'buyer'

                            const messageKind =
                              message.messageType ||
                              message.type

                            const isSystem =
                              messageKind ===
                                'system_notice'

                            const messageId =
                              getChatMessageId(
                                message
                              )

                            const previousMessage =
                              index > 0
                                ? messages[
                                    index - 1
                                  ]
                                : undefined

                            const showDateSeparator =
                              chatMessageDateKey(
                                previousMessage
                                  ?.createdAt
                              ) !==
                              chatMessageDateKey(
                                message.createdAt
                              )

                            const replyTarget =
                              message
                                .replyToMessageId
                                ? messagesById.get(
                                    message
                                      .replyToMessageId
                                  )
                                : undefined

                            const dateSeparator =
                              showDateSeparator ? (
                                <div className="flex items-center justify-center py-0.5">
                                  <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-slate-500">
                                    {formatMessageDate(
                                      message.createdAt
                                    )}
                                  </span>
                                </div>
                              ) : null

                            if (isSystem) {
                              return (
                                <div
                                  key={`${message.messageId}-${message.sequence}`}
                                  className="space-y-1.5"
                                >
                                  {dateSeparator}

                                  <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white px-3 py-2 text-center text-[11px] font-semibold leading-4 text-slate-500">
                                    {message.text}
                                  </div>
                                </div>
                              )
                            }

                            return (
                              <div
                                key={`${message.messageId}-${message.sequence}`}
                                className="space-y-1"
                              >
                                {dateSeparator}

                                <div
                                  className={`flex items-end gap-1.5 ${
                                  isBuyer
                                    ? 'justify-end'
                                    : 'justify-start'
                                }`}
                              >
                                {!isBuyer && (
                                  <MessageAvatar
                                    message={message}
                                    fallbackItem={selectedConversation || undefined}
                                    fallbackLabel="Marketplace seller"
                                  />
                                )}

                                <div
                                  className={`max-w-[84%] rounded-xl border px-2.5 py-1 shadow-sm sm:max-w-[68%] ${
                                    isBuyer
                                      ? 'rounded-br-md border-indigo-950 bg-[#312e81] text-white'
                                      : 'rounded-bl-md border-slate-200 bg-white text-slate-950'
                                  }`}
                                >
                                  {!message.deleted &&
                                    message.replyToMessageId && (
                                    <div
                                      className={`mb-1.5 rounded-lg border px-2.5 py-1.5 ${
                                        isBuyer
                                          ? 'border-white/15 bg-white/10'
                                          : 'border-slate-200 bg-slate-50'
                                      }`}
                                    >
                                      <p
                                        className={`text-[9px] font-black uppercase tracking-wide ${
                                          isBuyer
                                            ? 'text-white/60'
                                            : 'text-dh-secondary'
                                        }`}
                                      >
                                        Reply
                                      </p>

                                      <p
                                        className={`mt-0.5 truncate text-[11px] font-semibold ${
                                          isBuyer
                                            ? 'text-white/85'
                                            : 'text-slate-600'
                                        }`}
                                      >
                                        {getReplyPreviewText(
                                          replyTarget
                                        )}
                                      </p>
                                    </div>
                                  )}

                                  {message.deleted && (
                                    <p
                                      className={`text-xs font-medium italic ${
                                        isBuyer
                                          ? 'text-white/70'
                                          : 'text-slate-400'
                                      }`}
                                    >
                                      Message deleted
                                    </p>
                                  )}

                                  {!message.deleted &&
                                    messageKind ===
                                    'product_card' && (
                                    <ProductContextCard
                                      message={
                                        message
                                      }
                                    />
                                  )}

                                  {!message.deleted &&
                                    messageKind ===
                                    'order_card' && (
                                    <OrderContextCard
                                      message={
                                        message
                                      }
                                    />
                                  )}

                                  {!message.deleted &&
                                    (messageKind === 'image' || messageKind === 'video') &&
                                    (message.attachments?.[0] ? (
                                      <MediaAttachmentCard
                                        attachment={message.attachments[0]}
                                        isMine={isBuyer}
                                        onOpenImage={setSelectedChatImage}
                                      />
                                    ) : (
                                      <div className="flex min-h-28 min-w-48 flex-col items-center justify-center rounded-2xl border border-dashed border-current/25 p-4 text-center opacity-75">
                                        {messageKind === 'image' ? (
                                          <ImageIcon className="h-7 w-7" />
                                        ) : (
                                          <Video className="h-7 w-7" />
                                        )}
                                        <p className="mt-2 text-xs font-bold">Media unavailable</p>
                                      </div>
                                    ))}

                                  {!message.deleted &&
                                    message.text &&
                                    messageKind !==
                                      'product_card' &&
                                    messageKind !==
                                      'order_card' &&
                                    messageKind !== 'image' &&
                                    messageKind !== 'video' && (
                                    <p className="whitespace-pre-wrap break-words font-sans text-[12px] font-medium leading-[17px] tracking-[-0.01em] sm:text-[13px] sm:leading-[18px]">
                                      {message.text}
                                    </p>
                                  )}

                                  <p
                                    className={`mt-1 text-[9px] font-semibold ${
                                      isBuyer
                                        ? 'text-white/60'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    {formatMessageTime(
                                      message.createdAt
                                    )}

                                    {message.editedAt &&
                                      !message.deleted && (
                                      <>
                                        {' · edited'}
                                      </>
                                    )}

                                    {isBuyer && message.localStatus === 'sending' && (
                                      <>{' · Sending…'}</>
                                    )}

                                    {isBuyer && message.localStatus === 'failed' && (
                                      <>
                                        {' · '}
                                        <button type="button" onClick={() => void retryOptimisticMessage(message)} className="font-black text-amber-200 underline underline-offset-2">
                                          Not sent — retry
                                        </button>
                                      </>
                                    )}

                                    {isBuyer && !message.localStatus && (
                                      <>
                                        {' · '}

                                        {message.sequence <=
                                        counterpartyReceipt.readSequence ? (
                                          <CheckCheck
                                            className="inline h-3.5 w-3.5 align-[-2px] text-dh-secondary"
                                            aria-label="Read"
                                          />
                                        ) : message.sequence <=
                                          counterpartyReceipt.deliveredSequence ? (
                                          <CheckCheck
                                            className="inline h-3.5 w-3.5 align-[-2px] text-white/60"
                                            aria-label="Delivered"
                                          />
                                        ) : (
                                          <Check
                                            className="inline h-3.5 w-3.5 align-[-2px] text-white/60"
                                            aria-label="Sent"
                                          />
                                        )}
                                      </>
                                    )}
                                  </p>

                                  {!message.deleted && !message.localStatus && (
                                    <div
                                      className={`mt-0.5 flex items-center gap-2.5 text-[9px] font-black ${
                                        isBuyer
                                          ? 'text-white/70'
                                          : 'text-slate-400'
                                      }`}
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          beginReply(
                                            message
                                          )
                                        }
                                        className="transition hover:underline"
                                      >
                                        Reply
                                      </button>

                                      {isBuyer && messageId && (
                                        <>
                                          {messageKind === 'text' && canMutateMessage(
                                            message,
                                            messageClock
                                          ) && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                beginEdit(
                                                  message
                                                )
                                              }
                                              disabled={
                                                mutationMessageId ===
                                                  messageId
                                              }
                                              className="transition hover:underline disabled:opacity-50"
                                            >
                                              Edit
                                            </button>
                                          )}

                                          {canRecallMessage(
                                            message,
                                            messageClock
                                          ) && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                void handleDeleteMessage(
                                                  message
                                                )
                                              }
                                              disabled={
                                                mutationMessageId ===
                                                  messageId
                                              }
                                              className="transition hover:underline disabled:opacity-50"
                                            >
                                              {mutationMessageId ===
                                              messageId
                                                ? 'Recalling…'
                                                : 'Recall'}
                                            </button>
                                          )}
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {isBuyer && (
                                  <MessageAvatar
                                    message={message}
                                    fallbackLabel="You"
                                  />
                                )}
                              </div>
                            </div>
                            )
                          }
                        )}

                        {outgoingMediaItems.filter((item) => item.conversationId === conversationId).length > 0 && (
                          <div className="ml-auto flex max-w-[86%] justify-end sm:max-w-[68%]">
                            <div className="w-full rounded-[22px] rounded-br-md bg-dh-primary p-2.5 text-white shadow-sm">
                              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                                {outgoingMediaItems.filter((item) => item.conversationId === conversationId).map(item => (
                                  <div key={item.clientMessageId} className="relative aspect-square overflow-hidden rounded-2xl bg-slate-900">
                                    {item.file.type.startsWith('image/') ? (
                                      <img src={item.previewUrl} alt={item.file.name} className={`h-full w-full object-cover transition ${item.status === 'uploading' ? 'scale-105 grayscale opacity-40' : ''}`} />
                                    ) : (
                                      <video src={item.previewUrl} muted playsInline preload="metadata" className={`h-full w-full object-cover ${item.status === 'uploading' ? 'grayscale opacity-40' : ''}`} aria-label={item.file.name} />
                                    )}
                                    {item.status === 'uploading' && (
                                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/25 text-white">
                                        <Loader2 className="mb-1 h-5 w-5 animate-spin" />
                                        <span className="text-sm font-black drop-shadow">{item.progress}%</span>
                                        <div className="mt-1.5 h-1.5 w-14 overflow-hidden rounded-full bg-white/30"><div className="h-full rounded-full bg-white transition-[width]" style={{ width: `${item.progress}%` }} /></div>
                                      </div>
                                    )}
                                    {item.status === 'sent' && <div className="absolute inset-0 flex items-center justify-center bg-emerald-600/45"><Check className="h-6 w-6 text-white" /></div>}
                                    {item.status === 'error' && <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-800/65 p-2 text-center"><span className="text-[10px] font-black">Upload failed</span></div>}
                                    {item.status === 'error' && (
                                      <button type="button" onClick={() => void uploadOutgoingMedia(item)} className="absolute bottom-1.5 left-1.5 rounded-full bg-white px-2.5 py-1 text-[9px] font-black text-dh-primary shadow">Retry</button>
                                    )}
                                    {item.status === 'error' && (
                                      <button type="button" onClick={() => removeOutgoingMedia(item.clientMessageId)} className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-white" aria-label={`Remove ${item.file.name}`}><X className="h-3.5 w-3.5" /></button>
                                    )}
                                    <span className="absolute bottom-1.5 right-1.5 rounded bg-black/55 px-1.5 py-0.5 text-[8px] font-bold text-white">{formatMediaSize(item.file.size)}</span>
                                  </div>
                                ))}
                              </div>
                              <p className="mt-2 px-1 text-[10px] font-bold text-white/75">Uploads continue here while you keep messaging</p>
                            </div>
                          </div>
                        )}

                        <div
                          ref={
                            messageEndRef
                          }
                        />
                      </div>
                    )}
                    </div>

                    {isLoadingOlder && (
                      <div className="pointer-events-none absolute left-1/2 top-3 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs font-bold text-slate-500 shadow-sm">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading earlier messages…
                      </div>
                    )}

                    {showScrollToBottom && (
                      <button
                        type="button"
                        onClick={
                          scrollToLatest
                        }
                        className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-dh-primary px-3 py-2 text-xs font-black text-white shadow-lg transition hover:bg-dh-secondary"
                        aria-label="Scroll to latest messages"
                      >
                        <ArrowDown className="h-4 w-4" />
                        New messages
                      </button>
                    )}
                  </div>

                  <form
                    onSubmit={
                      handleSend
                    }
                    className="border-t border-slate-100 bg-white p-1.5 sm:p-2"
                  >
                    {(replyingTo ||
                      editingMessage) && (
                      <div className="mb-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                        <div className="min-w-0 flex-1 border-l-4 border-dh-secondary pl-3">
                          <p className="text-[10px] font-black uppercase tracking-wide text-dh-secondary">
                            {editingMessage
                              ? 'Editing message'
                              : 'Replying to message'}
                          </p>

                          <p className="mt-0.5 truncate text-xs font-semibold text-slate-600">
                            {getReplyPreviewText(
                              editingMessage ||
                                replyingTo
                            )}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (
                              editingMessage
                            ) {
                              setEditingMessage(
                                null
                              )
                              setDraft('')
                            } else {
                              setReplyingTo(
                                null
                              )
                            }
                          }}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white hover:text-dh-primary"
                          aria-label={
                            editingMessage
                              ? 'Cancel editing'
                              : 'Cancel reply'
                          }
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {isPreparingMedia && (
                      <div className="mb-2 flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600">
                        <Loader2 className="h-4 w-4 animate-spin" /> Optimizing selected media for a faster upload…
                      </div>
                    )}

                    {pendingMediaItems.length > 0 && !isMediaBatchInConversation && (
                      <div className="mb-2 rounded-2xl border border-[#26248c]/15 bg-slate-50 p-2.5">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-black text-[#26248c]">{pendingMediaItems.length} attachment{pendingMediaItems.length === 1 ? '' : 's'} ready</p>
                            <p className="text-[10px] font-semibold text-slate-500">Images are optimized before upload</p>
                          </div>
                          <div className="flex gap-1.5">
                            <button type="button" onClick={clearPendingMedia} disabled={isSendingMedia} className="rounded-full px-2.5 py-1.5 text-[10px] font-black text-slate-500 hover:bg-white disabled:opacity-50">Clear</button>
                            <button type="button" onClick={() => void handleSendMedia()} disabled={isSendingMedia} className="rounded-full bg-[#26248c] px-3 py-1.5 text-[10px] font-black text-white hover:bg-[#ffb54a] hover:text-[#26248c] disabled:opacity-60">
                              {isSendingMedia ? 'Uploading…' : `Send ${pendingMediaItems.length}`}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                          {pendingMediaItems.map(item => (
                            <div key={item.id} className="group relative aspect-square overflow-hidden rounded-xl bg-slate-900">
                              {item.file.type.startsWith('image/') ? (
                                <img src={item.previewUrl} alt={item.file.name} className={`h-full w-full object-cover transition ${item.status === 'uploading' ? 'scale-105 grayscale opacity-45' : ''}`} />
                              ) : (
                                <video src={item.previewUrl} muted playsInline preload="metadata" className={`h-full w-full object-cover ${item.status === 'uploading' ? 'grayscale opacity-45' : ''}`} aria-label={item.file.name} />
                              )}

                              {item.status === 'uploading' && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                                  <span className="text-sm font-black drop-shadow">{item.progress}%</span>
                                  <div className="mt-1 h-1 w-10 overflow-hidden rounded-full bg-white/35"><div className="h-full bg-white transition-[width]" style={{ width: `${item.progress}%` }} /></div>
                                </div>
                              )}
                              {item.status === 'sent' && <div className="absolute inset-0 flex items-center justify-center bg-emerald-600/50"><Check className="h-6 w-6 text-white" /></div>}
                              {item.status === 'error' && <div className="absolute inset-0 flex items-center justify-center bg-red-700/55 px-1 text-center text-[9px] font-black text-white">Retry</div>}
                              {!isSendingMedia && (
                                <button type="button" onClick={() => removePendingMedia(item.id)} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-white opacity-90" aria-label={`Remove ${item.file.name}`}><X className="h-3.5 w-3.5" /></button>
                              )}
                              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[8px] font-bold text-white">{formatMediaSize(item.file.size)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {pendingOrder &&
                      pendingOrder
                        .conversationId ===
                          conversationId && (
                      <div className="mb-3 flex items-center gap-3 rounded-2xl border border-dh-primary/20 bg-dh-primary/5 p-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white text-dh-primary">
                          {pendingOrder
                            .items[0]
                            ?.imageUrl ? (
                            <img
                              src={
                                pendingOrder
                                  .items[0]
                                  .imageUrl
                              }
                              alt={
                                pendingOrder
                                  .items[0]
                                  .name ||
                                'Order item'
                              }
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <PackageCheck className="h-5 w-5" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black uppercase tracking-wide text-dh-primary">
                            Order ready to share
                          </p>

                          <p className="truncate text-sm font-black text-dh-primary">
                            Order #
                            {
                              pendingOrder.number
                            }
                          </p>

                          <p className="mt-0.5 truncate text-xs font-bold text-slate-500">
                            {
                              pendingOrder.storeName
                            }
                            {' · '}
                            {
                              pendingOrder
                                .items.length
                            }
                            {' '}
                            {pendingOrder
                              .items.length ===
                            1
                              ? 'item'
                              : 'items'}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            void handleSendOrder()
                          }
                          disabled={
                            isSendingOrder ||
                            isSendingProduct ||
                            isSendingMedia ||
                            isSending
                          }
                          className="shrink-0 rounded-full bg-dh-primary px-3 py-2 text-xs font-black text-white transition hover:bg-dh-secondary disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isSendingOrder
                            ? 'Sending…'
                            : 'Send order'}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setPendingOrder(
                              null
                            )
                          }
                          disabled={
                            isSendingOrder
                          }
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white hover:text-dh-primary disabled:opacity-50"
                          aria-label="Dismiss order"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {pendingProduct &&
                      pendingProduct
                        .conversationId ===
                          conversationId && (
                      <div className="mb-3 flex items-center gap-3 rounded-2xl border border-dh-secondary/30 bg-dh-secondary/10 p-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
                          {pendingProduct.imageUrl ? (
                            <img
                              src={
                                pendingProduct.imageUrl
                              }
                              alt={
                                pendingProduct.name
                              }
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Store className="h-5 w-5 text-dh-primary" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black uppercase tracking-wide text-dh-primary">
                            Product ready to share
                          </p>

                          <p className="truncate text-sm font-black text-dh-primary">
                            {
                              pendingProduct.name
                            }
                          </p>

                          {pendingProduct.price && (
                            <p className="mt-0.5 text-xs font-bold text-slate-500">
                              {
                                pendingProduct.price
                              }
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            void handleSendProduct()
                          }
                          disabled={
                            isSendingProduct ||
                            isSendingOrder ||
                            isSendingMedia ||
                            isSending
                          }
                          className="shrink-0 rounded-full bg-dh-primary px-3 py-2 text-xs font-black text-white transition hover:bg-dh-secondary disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isSendingProduct
                            ? 'Sending…'
                            : 'Send product'}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setPendingProduct(
                              null
                            )
                          }
                          disabled={
                            isSendingProduct
                          }
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white hover:text-dh-primary disabled:opacity-50"
                          aria-label="Dismiss product"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-end gap-2">
                      <input
                        ref={mediaInputRef}
                        type="file"
                        accept={CHAT_MEDIA_ACCEPT}
                        multiple
                        onChange={handleMediaSelection}
                        className="sr-only"
                        aria-label="Choose an image or video"
                      />

                      <button
                        type="button"
                        onClick={() => mediaInputRef.current?.click()}
                        disabled={isPreparingMedia}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-dh-primary transition hover:border-dh-primary hover:bg-dh-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                        aria-label="Attach an image or video"
                        title="Attach photo or video"
                      >
                        <Paperclip className="h-5 w-5" />
                      </button>

                      <textarea
                        disabled={isPreparingMedia}
                        value={
                          draft
                        }
                        onChange={event => {
                          const nextDraft =
                            event.target.value.slice(
                              0,
                              4000
                            )

                          setDraft(
                            nextDraft
                          )

                          const socket =
                            socketRef.current

                          if (
                            editingMessage ||
                            !conversationId ||
                            !socket?.connected ||
                            joinedConversationRef
                              .current !==
                                conversationId
                          ) {
                            return
                          }

                          socket.emit(
                            nextDraft.trim()
                              ? 'typing:start'
                              : 'typing:stop',
                            {
                              conversationId
                            }
                          )
                        }}
                        onBlur={() => {
                          if (
                            conversationId &&
                            joinedConversationRef
                              .current ===
                                conversationId
                          ) {
                            socketRef.current?.emit(
                              'typing:stop',
                              {
                                conversationId
                              }
                            )
                          }
                        }}
                        onKeyDown={event => {
                          if (
                            event.key ===
                              'Enter' &&
                            !event.shiftKey
                          ) {
                            event.preventDefault()

                            event
                              .currentTarget
                              .form
                              ?.requestSubmit()
                          }
                        }}
                        placeholder={
                          editingMessage
                            ? 'Edit your message...'
                            : replyingTo
                              ? 'Write a reply...'
                              : 'Write a message...'
                        }
                        rows={1}
                        className="min-h-10 max-h-28 flex-1 resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 font-sans text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-700 focus:ring-2 focus:ring-indigo-100"
                      />

                      <button
                        type="submit"
                        disabled={
                          isSending ||
                          Boolean(
                            mutationMessageId
                          ) ||
                          !draft.trim()
                        }
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#312e81] text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSending ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Send className="h-5 w-5" />
                        )}
                      </button>
                    </div>

                    <div className="mt-1 flex items-center justify-between gap-3 px-1">
                      <p className="text-[10px] font-semibold text-slate-400">
                        Enter to send · Shift + Enter for a new line
                      </p>

                      <p className="text-[10px] font-bold text-slate-400">
                        {draft.length}/4000
                      </p>
                    </div>
                  </form>
                </>
              )}
            </section>
          </div>
        </div>
      </main>

      <ChatImageLightbox attachment={selectedChatImage} onClose={() => setSelectedChatImage(null)} />
      <Footer />
    </div>
  )
}
