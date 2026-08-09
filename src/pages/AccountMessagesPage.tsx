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

  const socketRef =
    useRef<Socket | null>(
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
      if (!conversationId) {
        setMessages([])
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

      let socket:
        Socket | null = null

      try {
        socket =
          createBuyerChatSocket()

        socketRef.current =
          socket

        socket.on(
          'conversation:changed',
          () => {
            void loadInbox()
          }
        )

        socket.on(
          'message:available',
          (
            event: {
              conversationId?: string
              sequence?: number
            }
          ) => {
            void loadInbox()

            if (
              event
                .conversationId &&
              event
                .conversationId ===
                conversationId
            ) {
              void loadConversation(
                event
                  .conversationId
              )
            }
          }
        )

        socket.connect()
      } catch (
        connectionError
      ) {
        console.error(
          '[buyer-chat] realtime connection failed',
          connectionError
        )
      }

      return () => {
        if (socket) {
          socket.removeAllListeners()
          socket.disconnect()
        }

        socketRef.current =
          null
      }
    },
    [
      conversationId,
      loadConversation,
      loadInbox
    ]
  )

  useEffect(
    () => {
      const socket =
        socketRef.current

      if (
        !socket ||
        !conversationId
      ) {
        return
      }

      const join = () => {
        socket.emit(
          'conversation:join',
          {
            conversationId
          }
        )
      }

      if (socket.connected) {
        join()
      } else {
        socket.once(
          'connect',
          join
        )
      }

      return () => {
        socket.off(
          'connect',
          join
        )

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

                      <p className="text-xs font-semibold text-green-700">
                        Marketplace conversation
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

                            const isSystem =
                              !message.sender ||
                              message.messageType ===
                                'system_notice' ||
                              message.type ===
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
                        onChange={event =>
                          setDraft(
                            event.target.value.slice(
                              0,
                              4000
                            )
                          )
                        }
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
