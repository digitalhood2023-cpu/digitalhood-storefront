import {
  useCallback,
  useEffect,
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
  ArrowLeft,
  Loader2,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldCheck,
  Store,
} from 'lucide-react'
import type {
  Socket
} from 'socket.io-client'

import Header from '@/sections/Header'
import Footer from '@/sections/Footer'
import {
  createBuyerChatSocket,
  getBuyerInbox,
  getBuyerMessages,
  markBuyerDelivered,
  markBuyerRead,
  sendBuyerMessage,
  type ChatInboxItem,
  type ChatMessage,
  type ChatReceiptSummary,
} from '@/api/chat'
import {
  getAccountToken
} from '@/api/account'

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

function getConversationTitle(
  item?: ChatInboxItem
) {
  return (
    item?.counterpartyName ||
    item?.storeName ||
    item?.sellerStoreName ||
    'Marketplace seller'
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

  return (
    <div className="mb-2 overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm">
      <div className="flex items-center gap-3 p-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
          {image ? (
            <img
              src={image}
              alt={name}
              className="h-full w-full object-cover"
            />
          ) : (
            <Store className="h-5 w-5 text-dh-primary" />
          )}
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-wide text-dh-secondary">
            Product inquiry
          </p>

          <p className="truncate text-sm font-black text-dh-primary">
            {name}
          </p>

          {price && (
            <p className="mt-1 text-xs font-bold text-slate-500">
              {price}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function mergeChatMessages(
  current: ChatMessage[],
  incoming: ChatMessage[]
) {
  const bySequence =
    new Map<number, ChatMessage>()

  for (const message of current) {
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
    draft,
    setDraft
  ] = useState('')

  const [
    error,
    setError
  ] = useState('')

  const [
    connectionState,
    setConnectionState
  ] = useState<
    'connecting' |
    'connected' |
    'reconnecting' |
    'offline'
  >('connecting')

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
                limit: 100
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

          setMessages(
            response.messages
          )

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
          setIsLoadingMessages(
            false
          )
        }
      },
      []
    )

  const syncConversation =
    useCallback(
      async (
        targetConversationId: string
      ) => {
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
              ),

              markBuyerRead(
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
        }
      },
      []
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

  useEffect(
    () => {
      messageEndRef
        .current
        ?.scrollIntoView({
          behavior: 'smooth'
        })
    },
    [messages.length]
  )

  useEffect(
    () => {
      if (
        !conversationId ||
        latestSequence < 1
      ) {
        return
      }

      void markBuyerRead(
        conversationId,
        latestSequence
      ).then(
        () =>
          loadInbox()
      ).catch(
        () => undefined
      )
    },
    [
      conversationId,
      latestSequence,
      loadInbox
    ]
  )

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
      isSending
    ) {
      return
    }

    setIsSending(true)
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

    try {
      await sendBuyerMessage(
        conversationId,
        text
      )

      setDraft('')

      await Promise.all([
        loadConversation(
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
          : 'Unable to send your message.'
      )
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-dh-gray">
      <Header />

      <main className="py-5 lg:py-8">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-dh-secondary">
                DigitalHood Marketplace
              </p>

              <h1 className="mt-1 font-display text-3xl font-black text-dh-primary sm:text-4xl">
                Messages
              </h1>
            </div>

            <Link
              to="/account"
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-dh-primary shadow-sm transition hover:bg-dh-primary hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              My account
            </Link>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          <div className="grid min-h-[68vh] overflow-hidden rounded-[2rem] bg-white shadow-sm md:grid-cols-[320px_minmax(0,1fr)]">
            <aside
              className={`border-r border-slate-100 ${
                conversationId
                  ? 'hidden md:flex'
                  : 'flex'
              } flex-col`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 p-4">
                <div>
                  <p className="font-display text-lg font-black text-dh-primary">
                    Conversations
                  </p>

                  <p className="text-xs font-semibold text-slate-400">
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
                  className="rounded-full bg-dh-gray p-2 text-dh-primary transition hover:bg-dh-secondary/20"
                  aria-label="Refresh messages"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {isLoadingInbox ? (
                  <div className="flex h-44 items-center justify-center">
                    <Loader2 className="h-7 w-7 animate-spin text-dh-primary" />
                  </div>
                ) : conversations.length === 0 ? (
                  <div className="p-6 text-center">
                    <MessageCircle className="mx-auto h-10 w-10 text-dh-primary" />

                    <p className="mt-3 font-black text-dh-primary">
                      No conversations yet
                    </p>

                    <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                      Open a product and choose Chat to start a secure conversation with its seller.
                    </p>
                  </div>
                ) : (
                  conversations.map(
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
                          className={`mb-1 w-full rounded-2xl p-3 text-left transition ${
                            active
                              ? 'bg-dh-primary text-white'
                              : 'hover:bg-dh-gray'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                                active
                                  ? 'bg-white/15'
                                  : 'bg-dh-secondary/15 text-dh-primary'
                              }`}
                            >
                              <Store className="h-4 w-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="truncate text-sm font-black">
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
                                className={`mt-1 truncate text-xs font-semibold ${
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
              } min-w-0 flex-col`}
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
                  <header className="flex items-center gap-3 border-b border-slate-100 p-4">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          '/account/messages'
                        )
                      }
                      className="rounded-full bg-dh-gray p-2 text-dh-primary md:hidden"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>

                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-dh-primary text-white">
                      <Store className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-display text-lg font-black text-dh-primary">
                        {getConversationTitle(
                          selectedConversation
                        )}
                      </h2>

                      <p className="text-xs font-semibold text-slate-500">
                        {sellerTyping
                          ? 'Seller is typing…'
                          : connectionState === 'connected'
                            ? sellerOnline === true
                              ? 'Seller online'
                              : sellerOnline === false
                                ? 'Seller offline'
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

                  <div className="border-b border-amber-100 bg-amber-50 px-4 py-3">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />

                      <p className="text-xs font-semibold leading-5 text-amber-800">
                        Keep payments and communication on DigitalHood. Never send passwords, OTPs or card details in chat.
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-5">
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
                      <div className="space-y-3">
                        {messages.map(
                          (
                            message
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

                            if (isSystem) {
                              return (
                                <div
                                  key={`${message.messageId}-${message.sequence}`}
                                  className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-xs font-semibold leading-5 text-slate-500"
                                >
                                  {message.text}
                                </div>
                              )
                            }

                            return (
                              <div
                                key={`${message.messageId}-${message.sequence}`}
                                className={`flex ${
                                  isBuyer
                                    ? 'justify-end'
                                    : 'justify-start'
                                }`}
                              >
                                <div
                                  className={`max-w-[88%] rounded-3xl px-4 py-3 sm:max-w-[72%] ${
                                    isBuyer
                                      ? 'rounded-br-md bg-dh-primary text-white'
                                      : 'rounded-bl-md bg-white text-slate-800 shadow-sm'
                                  }`}
                                >
                                  <ProductContextCard
                                    message={
                                      message
                                    }
                                  />

                                  {message.text && (
                                    <p className="whitespace-pre-wrap break-words text-sm font-medium leading-6">
                                      {message.text}
                                    </p>
                                  )}

                                  <p
                                    className={`mt-1.5 text-[10px] font-semibold ${
                                      isBuyer
                                        ? 'text-white/60'
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    {formatChatTime(
                                      message.createdAt
                                    )}

                                    {isBuyer && (
                                      <>
                                        {' · '}
                                        {message.sequence <=
                                        counterpartyReceipt.readSequence
                                          ? 'Read'
                                          : message.sequence <=
                                              counterpartyReceipt.deliveredSequence
                                            ? 'Delivered'
                                            : 'Sent'}
                                      </>
                                    )}
                                  </p>
                                </div>
                              </div>
                            )
                          }
                        )}

                        <div
                          ref={
                            messageEndRef
                          }
                        />
                      </div>
                    )}
                  </div>

                  <form
                    onSubmit={
                      handleSend
                    }
                    className="border-t border-slate-100 bg-white p-3 sm:p-4"
                  >
                    <div className="flex items-end gap-2">
                      <textarea
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
                        placeholder="Write a message..."
                        rows={1}
                        className="min-h-12 max-h-36 flex-1 resize-y rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-dh-primary focus:bg-white"
                      />

                      <button
                        type="submit"
                        disabled={
                          isSending ||
                          !draft.trim()
                        }
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-dh-primary text-white transition hover:bg-dh-secondary disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSending ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Send className="h-5 w-5" />
                        )}
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-3 px-1">
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

      <Footer />
    </div>
  )
}
