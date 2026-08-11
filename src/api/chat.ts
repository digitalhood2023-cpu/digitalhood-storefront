import { io, type Socket } from 'socket.io-client'
import { getAccountToken } from '@/api/account'

export const CHAT_API_URL =
  import.meta.env.VITE_CHAT_API_URL ||
  'https://chat.digitalhood.info'

export type ChatKind =
  | 'buyer'
  | 'seller'
  | 'admin'

export type ChatContext = {
  type?: string
  contextType?: string
  externalId?: string
  safeSnapshot?: Record<string, unknown>
  snapshot?: Record<string, unknown>
}

export type ChatMessage = {
  messageId?: string
  id?: string
  conversationId?: string
  sequence: number
  messageType?: string
  type?: string
  text: string
  sender?: {
    type?: string
    id?: string
  } | null
  contexts?: ChatContext[]
  createdAt?: string
}

export type ChatReceiptSummary = {
  deliveredSequence: number
  readSequence: number
}

export type ChatMessagePage = {
  count: number
  hasMore: boolean
  firstSequence: number | null
  latestSequence: number | null
}

export type ChatInboxItem = {
  conversationId: string
  conversationType?: string
  buyerId?: string
  storeId?: string
  storeName?: string
  sellerStoreName?: string
  counterpartyName?: string
  latestSequence: number
  unreadCount: number
  preview?: string | null
  latestMessagePreview?: string | null
  updatedAt?: string
  createdAt?: string
  status?: string
}

type RawRecord =
  Record<string, unknown>

function asRecord(
  value: unknown
): RawRecord {
  return (
    value &&
    typeof value === 'object'
  )
    ? value as RawRecord
    : {}
}

function stringValue(
  ...values: unknown[]
) {
  for (const value of values) {
    if (
      typeof value === 'string' &&
      value.trim()
    ) {
      return value.trim()
    }

    if (
      typeof value === 'number' &&
      Number.isFinite(value)
    ) {
      return String(value)
    }
  }

  return ''
}

function nullableSequence(
  value: unknown
): number | null {
  const parsed =
    Number(value)

  return (
    Number.isFinite(parsed) &&
    parsed > 0
  )
    ? parsed
    : null
}

function numberValue(
  ...values: unknown[]
) {
  for (const value of values) {
    const parsed =
      Number(value)

    if (
      Number.isFinite(parsed)
    ) {
      return parsed
    }
  }

  return 0
}

async function chatFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    getAccountToken()

  if (!token) {
    throw new Error(
      'Please sign in to use marketplace chat.'
    )
  }

  const response =
    await fetch(
      `${CHAT_API_URL}${path}`,
      {
        ...options,

        cache: 'no-store',

        headers: {
          'Content-Type':
            'application/json',

          Authorization:
            `Bearer ${token}`,

          ...(options.headers || {})
        }
      }
    )

  const data =
    await response
      .json()
      .catch(() => null)

  if (!response.ok) {
    const error =
      data?.error ||
      data?.message ||
      `Chat request failed with status ${response.status}`

    throw new Error(
      String(error)
    )
  }

  return data as T
}

export async function openProductConversation(
  productId: string | number
) {
  const response =
    await chatFetch<{
      ok: boolean
      conversation: RawRecord
      product?: RawRecord
    }>(
      '/api/conversations/product',
      {
        method: 'POST',
        body: JSON.stringify({
          productId
        })
      }
    )

  const conversation =
    asRecord(
      response.conversation
    )

  const conversationId =
    stringValue(
      conversation.conversationId,
      conversation.id
    )

  if (!conversationId) {
    throw new Error(
      'Chat conversation was created without an identifier.'
    )
  }

  return {
    ...response,
    conversationId
  }
}

export async function getBuyerInbox(
  limit = 50
) {
  const response =
    await chatFetch<RawRecord>(
      `/api/conversations?kind=buyer&limit=${limit}`
    )

  const source =
    Array.isArray(
      response.conversations
    )
      ? response.conversations
      : Array.isArray(
          response.items
        )
        ? response.items
        : []

  const conversations =
    source
      .map<ChatInboxItem | null>((entry) => {
        const row =
          asRecord(entry)

        const conversationId =
          stringValue(
            row.conversationId,
            row.id
          )

        if (!conversationId) {
          return null
        }

        return {
          conversationId,

          conversationType:
            stringValue(
              row.conversationType,
              row.type
            ),

          buyerId:
            stringValue(
              row.buyerId
            ),

          storeId:
            stringValue(
              row.storeId,
              row.sellerStoreId
            ),

          storeName:
            stringValue(
              row.storeName,
              row.sellerStoreName,
              row.counterpartyName
            ),

          sellerStoreName:
            stringValue(
              row.sellerStoreName,
              row.storeName
            ),

          counterpartyName:
            stringValue(
              row.counterpartyName,
              row.storeName,
              row.sellerStoreName
            ),

          latestSequence:
            numberValue(
              row.latestSequence
            ),

          unreadCount:
            numberValue(
              row.unreadCount
            ),

          preview:
            stringValue(
              row.preview,
              row.latestMessagePreview
            ) || null,

          latestMessagePreview:
            stringValue(
              row.latestMessagePreview,
              row.preview
            ) || null,

          updatedAt:
            stringValue(
              row.updatedAt
            ),

          createdAt:
            stringValue(
              row.createdAt
            ),

          status:
            stringValue(
              row.status
            )
        } satisfies ChatInboxItem
      })
      .filter(
        (
          value
        ): value is ChatInboxItem =>
          value !== null
      )

  return {
    conversations
  }
}

function normalizeContext(
  value: unknown
): ChatContext {
  const row =
    asRecord(value)

  const safeSnapshot =
    asRecord(
      row.safeSnapshot ||
      row.snapshot
    )

  return {
    type:
      stringValue(
        row.type,
        row.contextType
      ),

    contextType:
      stringValue(
        row.contextType,
        row.type
      ),

    externalId:
      stringValue(
        row.externalId
      ),

    safeSnapshot,

    snapshot:
      safeSnapshot
  }
}

function normalizeMessage(
  value: unknown
): ChatMessage | null {
  const row =
    asRecord(value)

  const sequence =
    numberValue(
      row.sequence,
      row.sequenceNo
    )

  if (
    !Number.isSafeInteger(sequence) ||
    sequence < 1
  ) {
    return null
  }

  const senderRecord =
    asRecord(
      row.sender
    )

  return {
    messageId:
      stringValue(
        row.messageId,
        row.id
      ),

    id:
      stringValue(
        row.id,
        row.messageId
      ),

    conversationId:
      stringValue(
        row.conversationId
      ),

    sequence,

    messageType:
      stringValue(
        row.messageType,
        row.type
      ),

    type:
      stringValue(
        row.type,
        row.messageType
      ),

    text:
      stringValue(
        row.text
      ),

    sender:
      Object.keys(
        senderRecord
      ).length
        ? {
            type:
              stringValue(
                senderRecord.type
              ),

            id:
              stringValue(
                senderRecord.id
              )
          }
        : null,

    contexts:
      Array.isArray(
        row.contexts
      )
        ? row.contexts.map(
            normalizeContext
          )
        : [],

    createdAt:
      stringValue(
        row.createdAt
      )
  }
}

export async function getBuyerMessages(
  conversationId: string,
  options: {
    limit?: number
    afterSequence?: number
    beforeSequence?: number
  } = {}
) {
  const params =
    new URLSearchParams()

  params.set(
    'kind',
    'buyer'
  )

  params.set(
    'limit',
    String(
      options.limit || 100
    )
  )

  if (
    options.afterSequence !==
    undefined
  ) {
    params.set(
      'afterSequence',
      String(
        options.afterSequence
      )
    )
  }

  if (
    options.beforeSequence !==
    undefined
  ) {
    params.set(
      'beforeSequence',
      String(
        options.beforeSequence
      )
    )
  }

  const response =
    await chatFetch<RawRecord>(
      `/api/conversations/${encodeURIComponent(
        conversationId
      )}/messages?${params.toString()}`
    )

  const source =
    Array.isArray(
      response.messages
    )
      ? response.messages
      : []

  const receiptRow =
    asRecord(
      response.counterpartyReceipt
    )

  const pageRow =
    asRecord(
      response.page
    )

  return {
    ...response,

    counterpartyReceipt:
      Object.keys(receiptRow).length
        ? {
            deliveredSequence:
              numberValue(
                receiptRow.deliveredSequence
              ),

            readSequence:
              numberValue(
                receiptRow.readSequence
              )
          } satisfies ChatReceiptSummary
        : null,

    messages:
      source
        .map(
          normalizeMessage
        )
        .filter(
          (
            value
          ): value is ChatMessage =>
            value !== null
        ),

    page: {
      count:
        numberValue(
          pageRow.count
        ),

      hasMore:
        pageRow.hasMore === true,

      firstSequence:
        nullableSequence(
          pageRow.firstSequence
        ),

      latestSequence:
        nullableSequence(
          pageRow.latestSequence
        )
    } satisfies ChatMessagePage
  }
}

export async function sendBuyerMessage(
  conversationId: string,
  text: string
) {
  return chatFetch<RawRecord>(
    `/api/conversations/${encodeURIComponent(
      conversationId
    )}/messages`,
    {
      method: 'POST',

      body:
        JSON.stringify({
          kind: 'buyer',

          clientMessageId:
            window.crypto
              .randomUUID(),

          text
        })
    }
  )
}

async function updateBuyerReceipt(
  conversationId: string,
  mode: 'delivered' | 'read',
  sequence?: number
) {
  return chatFetch<RawRecord>(
    `/api/conversations/${encodeURIComponent(
      conversationId
    )}/${mode}`,
    {
      method: 'POST',

      body:
        JSON.stringify({
          kind: 'buyer',

          ...(sequence !== undefined
            ? {
                sequence
              }
            : {})
        })
    }
  )
}

export function markBuyerDelivered(
  conversationId: string,
  sequence?: number
) {
  return updateBuyerReceipt(
    conversationId,
    'delivered',
    sequence
  )
}

export async function markBuyerRead(
  conversationId: string,
  sequence?: number
) {
  const receipt =
    await updateBuyerReceipt(
      conversationId,
      'read',
      sequence
    )

  if (
    typeof window !==
    'undefined'
  ) {
    window.dispatchEvent(
      new Event(
        'digitalhood:chat-unread-refresh'
      )
    )
  }

  return receipt
}

export function createBuyerChatSocket():
  Socket {
  const token =
    getAccountToken()

  if (!token) {
    throw new Error(
      'Buyer session is required.'
    )
  }

  return io(
    CHAT_API_URL,
    {
      autoConnect: false,

      transports: [
        'websocket',
        'polling'
      ],

      auth: {
        kind: 'buyer',
        token
      },

      reconnection: true,
      reconnectionAttempts:
        Infinity,

      reconnectionDelay:
        500,

      reconnectionDelayMax:
        5000
    }
  )
}
