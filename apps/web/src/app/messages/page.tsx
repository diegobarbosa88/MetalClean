'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { io, type Socket } from 'socket.io-client'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'
const SOCKET_URL = process.env['NEXT_PUBLIC_SOCKET_URL'] ?? 'http://localhost:3001'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  fullName?: string
  companyName?: string
  slug?: string
  avatarUrl?: string
  logoUrl?: string
}

interface OtherUser {
  id: string
  accountType: string
  workerProfile?: Profile
  companyProfile?: Profile
}

interface Conversation {
  id: string
  participantA: string
  participantB: string
  lastMessageAt?: string
  lastMessagePreview?: string
  otherUser?: OtherUser
  unreadCount?: number
}

interface MessageSender {
  id: string
  accountType: string
  workerProfile?: Profile
  companyProfile?: Profile
}

interface Message {
  id: string
  conversationId: string
  senderId: string
  content: string
  attachmentUrl?: string
  isRead: boolean
  createdAt: string
  sender?: MessageSender
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDisplayName(user?: OtherUser | null): string {
  if (!user) return 'Utilizador'
  return (
    user.workerProfile?.fullName ??
    user.companyProfile?.companyName ??
    'Utilizador'
  )
}

function getAvatar(user?: OtherUser | MessageSender | null): string | undefined {
  if (!user) return undefined
  return user.workerProfile?.avatarUrl ?? user.companyProfile?.logoUrl
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) {
    return d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' })
}

// ─── Avatar component ─────────────────────────────────────────────────────────

function Avatar({ src, name, size = 10 }: { src?: string; name: string; size?: number }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  const cls = `w-${size} h-${size} rounded-full flex-shrink-0 flex items-center justify-center text-sm font-semibold bg-metal-700 text-metal-200`
  if (src) {
    return <img src={src} alt={name} className={`${cls} object-cover`} />
  }
  return <div className={cls}>{initials}</div>
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MessagesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initConvId = searchParams.get('conversationId')

  const [token, setToken] = useState<string | null>(null)
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(initConvId)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [hasMoreMessages, setHasMoreMessages] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [newConvUserId, setNewConvUserId] = useState('')
  const [showNewConv, setShowNewConv] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'thread'>('list')

  const socketRef = useRef<Socket | null>(null)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const isTypingRef = useRef(false)

  // ── Auth init ────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = localStorage.getItem('mc_token')
    if (!t) { router.push('/login'); return }
    setToken(t)

    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((me) => {
        if (me.id) setMyUserId(me.id)
        else router.push('/login')
      })
      .catch(() => router.push('/login'))
  }, [router])

  // ── Load conversations ───────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    if (!token) return
    const res = await fetch(`${API}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const data: Conversation[] = await res.json()
      setConversations(data)
    }
  }, [token])

  useEffect(() => {
    if (token) loadConversations()
  }, [token, loadConversations])

  // ── Load messages ────────────────────────────────────────────────────────
  const loadMessages = useCallback(
    async (convId: string, cursor?: string) => {
      if (!token || loadingMessages) return
      setLoadingMessages(true)
      const params = new URLSearchParams({ pageSize: '30' })
      if (cursor) params.set('cursor', cursor)
      const res = await fetch(`${API}/messages/${convId}?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        if (cursor) {
          setMessages((prev) => [...(data.data as Message[]), ...prev])
        } else {
          setMessages(data.data as Message[])
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'instant' }), 50)
        }
        setHasMoreMessages(data.hasMore)
        setNextCursor(data.nextCursor ?? null)
      }
      setLoadingMessages(false)
    },
    [token, loadingMessages]
  )

  useEffect(() => {
    if (!activeConvId || !token) return
    setMessages([])
    setNextCursor(null)
    setHasMoreMessages(false)
    setTypingUsers([])
    loadMessages(activeConvId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConvId, token])

  // ── Socket.IO ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return

    const socket = io(SOCKET_URL, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket'],
    })
    socketRef.current = socket

    socket.on('message:new', (payload: { message: Message; conversationId: string }) => {
      const { message, conversationId } = payload
      // Append if viewing that conversation
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev
        if (conversationId === activeConvId || message.conversationId === activeConvId) {
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
          return [...prev, message]
        }
        return prev
      })
      // Update conversation preview
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, lastMessagePreview: message.content, lastMessageAt: message.createdAt }
            : c
        )
      )
    })

    socket.on('typing:start', ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => (prev.includes(userId) ? prev : [...prev, userId]))
    })

    socket.on('typing:stop', ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => prev.filter((id) => id !== userId))
    })

    socket.on('messages:read', ({ conversationId }: { conversationId: string }) => {
      if (conversationId === activeConvId) {
        setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })))
      }
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
    // activeConvId intentionally excluded — socket stays up across conv changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // ── Typing indicators ────────────────────────────────────────────────────
  const handleTyping = () => {
    if (!socketRef.current || !activeConvId) return
    if (!isTypingRef.current) {
      isTypingRef.current = true
      socketRef.current.emit('typing:start', { conversationId: activeConvId })
    }
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false
      socketRef.current?.emit('typing:stop', { conversationId: activeConvId })
    }, 2000)
  }

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!draft.trim() || !activeConvId || !token) return
    const conv = conversations.find((c) => c.id === activeConvId)
    if (!conv?.otherUser) return

    setSending(true)
    const content = draft.trim()
    setDraft('')

    // Stop typing indicator
    if (isTypingRef.current) {
      isTypingRef.current = false
      socketRef.current?.emit('typing:stop', { conversationId: activeConvId })
    }

    // Optimistic: via socket for real-time
    socketRef.current?.emit('message:send', {
      recipientUserId: conv.otherUser.id,
      content,
    })

    setSending(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ── Start new conversation ────────────────────────────────────────────────
  const startConversation = async () => {
    if (!newConvUserId.trim() || !token) return
    const res = await fetch(`${API}/messages/with/${newConvUserId.trim()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      const conv = await res.json()
      if (conv?.id) {
        await loadConversations()
        setActiveConvId(conv.id)
        setMobileView('thread')
        setShowNewConv(false)
        setNewConvUserId('')
        return
      }
    }
    // Conversation doesn't exist yet — send first message to create it
    alert('Utilizador não encontrado ou sem conversa existente. Use "Contactar" no perfil do utilizador para iniciar.')
  }

  // ── Select conversation ──────────────────────────────────────────────────
  const selectConversation = (id: string) => {
    setActiveConvId(id)
    setMobileView('thread')
    // Mark as read
    socketRef.current?.emit('messages:read', { conversationId: id })
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
    )
  }

  // ── Load more (scroll to top) ─────────────────────────────────────────────
  const handleScroll = useCallback(() => {
    if (!threadRef.current || !hasMoreMessages || loadingMessages || !activeConvId) return
    if (threadRef.current.scrollTop < 80 && nextCursor) {
      const prevHeight = threadRef.current.scrollHeight
      loadMessages(activeConvId, nextCursor).then(() => {
        // Restore scroll position
        if (threadRef.current) {
          threadRef.current.scrollTop = threadRef.current.scrollHeight - prevHeight
        }
      })
    }
  }, [hasMoreMessages, loadingMessages, activeConvId, nextCursor, loadMessages])

  useEffect(() => {
    const el = threadRef.current
    if (!el) return
    el.addEventListener('scroll', handleScroll)
    return () => el.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  if (!token) return null

  const activeConv = conversations.find((c) => c.id === activeConvId)
  const otherUser = activeConv?.otherUser
  const otherName = getDisplayName(otherUser)

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen flex-col bg-metal-950 text-white">
      <Navbar isAuthenticated />

      <div className="flex flex-1 overflow-hidden">
        {/* ─── Left panel: conversation list ─── */}
        <aside
          className={`flex w-full flex-col border-r border-metal-800 bg-metal-900 md:w-80 md:flex-shrink-0 ${
            mobileView === 'thread' ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="flex items-center justify-between border-b border-metal-800 p-4">
            <h2 className="text-base font-semibold">Mensagens</h2>
            <button
              onClick={() => setShowNewConv(true)}
              className="rounded-lg bg-orange-500 p-1.5 text-white hover:bg-orange-600"
              title="Nova conversa"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {showNewConv && (
            <div className="border-b border-metal-800 p-3">
              <input
                className="input mb-2 text-xs"
                placeholder="User ID (UUID) do destinatário"
                value={newConvUserId}
                onChange={(e) => setNewConvUserId(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={startConversation}
                  className="flex-1 rounded bg-orange-500 py-1.5 text-xs font-medium text-white hover:bg-orange-600"
                >
                  Ir
                </button>
                <button
                  onClick={() => { setShowNewConv(false); setNewConvUserId('') }}
                  className="flex-1 rounded bg-metal-700 py-1.5 text-xs font-medium text-metal-300 hover:bg-metal-600"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 && (
              <p className="p-6 text-center text-sm text-metal-500">
                Nenhuma conversa ainda.
                <br />
                Contacta um trabalhador ou empresa pelo seu perfil.
              </p>
            )}
            {conversations.map((conv) => {
              const name = getDisplayName(conv.otherUser)
              const avatar = getAvatar(conv.otherUser)
              const isActive = conv.id === activeConvId
              return (
                <button
                  key={conv.id}
                  onClick={() => selectConversation(conv.id)}
                  className={`flex w-full items-center gap-3 border-b border-metal-800 px-4 py-3 text-left transition-colors ${
                    isActive ? 'bg-metal-800' : 'hover:bg-metal-800/60'
                  }`}
                >
                  <div className="relative">
                    <Avatar src={avatar} name={name} size={10} />
                    {(conv.unreadCount ?? 0) > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between">
                      <span className="truncate text-sm font-medium text-white">{name}</span>
                      {conv.lastMessageAt && (
                        <span className="ml-2 flex-shrink-0 text-[11px] text-metal-500">
                          {formatTime(conv.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    {conv.lastMessagePreview && (
                      <p className="mt-0.5 truncate text-xs text-metal-400">
                        {conv.lastMessagePreview}
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        {/* ─── Right panel: thread ─── */}
        <section
          className={`flex flex-1 flex-col ${
            mobileView === 'list' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeConv ? (
            <>
              {/* Thread header */}
              <div className="flex items-center gap-3 border-b border-metal-800 bg-metal-900 px-4 py-3">
                <button
                  className="mr-1 rounded p-1 text-metal-400 hover:text-white md:hidden"
                  onClick={() => setMobileView('list')}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <Avatar src={getAvatar(otherUser)} name={otherName} size={9} />
                <div>
                  <p className="text-sm font-semibold">{otherName}</p>
                  {typingUsers.length > 0 && (
                    <p className="text-xs text-orange-400 animate-pulse">a escrever…</p>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div
                ref={threadRef}
                className="flex-1 overflow-y-auto px-4 py-4"
              >
                {loadingMessages && messages.length === 0 && (
                  <p className="text-center text-sm text-metal-500">A carregar…</p>
                )}
                {hasMoreMessages && (
                  <div className="mb-4 flex justify-center">
                    <button
                      onClick={() => activeConvId && nextCursor && loadMessages(activeConvId, nextCursor)}
                      disabled={loadingMessages}
                      className="rounded-full bg-metal-800 px-4 py-1.5 text-xs text-metal-300 hover:bg-metal-700 disabled:opacity-50"
                    >
                      {loadingMessages ? 'A carregar…' : 'Carregar mais'}
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {messages.map((msg, i) => {
                    const isMine = msg.senderId === myUserId
                    const showAvatar =
                      !isMine &&
                      (i === 0 || messages[i - 1]?.senderId !== msg.senderId)
                    return (
                      <div
                        key={msg.id}
                        className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isMine && (
                          <div className="w-7 flex-shrink-0">
                            {showAvatar && (
                              <Avatar
                                src={getAvatar(msg.sender)}
                                name={getDisplayName(msg.sender as OtherUser)}
                                size={7}
                              />
                            )}
                          </div>
                        )}
                        <div
                          className={`max-w-[70%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                            isMine
                              ? 'rounded-br-sm bg-orange-500 text-white'
                              : 'rounded-bl-sm bg-metal-800 text-metal-100'
                          }`}
                        >
                          {msg.content}
                          <div
                            className={`mt-0.5 text-[10px] ${
                              isMine ? 'text-orange-200' : 'text-metal-500'
                            } flex items-center gap-1`}
                          >
                            {formatTime(msg.createdAt)}
                            {isMine && msg.isRead && (
                              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="border-t border-metal-800 bg-metal-900 px-4 py-3">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => { setDraft(e.target.value); handleTyping() }}
                    onKeyDown={handleKeyDown}
                    placeholder="Escreve uma mensagem… (Enter para enviar)"
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-metal-700 bg-metal-800 px-3 py-2.5 text-sm text-white placeholder-metal-500 focus:border-orange-500 focus:outline-none"
                    style={{ maxHeight: '120px', overflowY: 'auto' }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!draft.trim() || sending}
                    className="flex-shrink-0 rounded-xl bg-orange-500 p-2.5 text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
                  >
                    <svg className="h-5 w-5 rotate-90" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-metal-500">
              <svg className="h-16 w-16 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="text-sm">Seleciona uma conversa para começar</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
