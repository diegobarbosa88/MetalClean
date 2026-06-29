'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { timeAgo, SPECIALTY_LABELS } from '@/lib/utils'

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'

const POST_TYPE_LABELS: Record<string, string> = {
  general: 'Geral',
  portfolio_work: 'Portfólio',
  job_update: 'Trabalho',
  news: 'Novidade',
  certification: 'Certificação',
}

interface PostMedia {
  type: 'image' | 'video'
  url: string
  thumbnailUrl?: string
  caption?: string
}

interface Post {
  id: string
  contentText?: string
  postType: string
  media: PostMedia[]
  likeCount: number
  commentCount: number
  createdAt: string
  isLikedByCurrentUser: boolean
  authorType: 'worker' | 'company'
  authorProfile: {
    fullName?: string
    companyName?: string
    slug: string
    avatarUrl?: string
    logoUrl?: string
    primarySpecialty?: string
  } | null
}

interface CommentItem {
  id: string
  content: string
  createdAt: string
  authorProfile?: { fullName?: string; slug: string; avatarUrl?: string }
  replies?: CommentItem[]
}

function PostCard({ post, token, onLike }: { post: Post; token: string | null; onLike: (id: string, liked: boolean) => void }) {
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<CommentItem[]>([])
  const [commentText, setCommentText] = useState('')
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [liking, setLiking] = useState(false)

  const authorName = post.authorProfile?.fullName ?? post.authorProfile?.companyName ?? 'Utilizador'
  const authorSlug = post.authorProfile?.slug ?? ''
  const authorAvatar = post.authorProfile?.avatarUrl ?? post.authorProfile?.logoUrl
  const profileHref = post.authorType === 'worker' ? `/workers/${authorSlug}` : `/companies/${authorSlug}`

  async function loadComments() {
    if (commentsLoaded) return
    const res = await fetch(`${API}/posts/${post.id}/comments`)
    if (res.ok) setComments(await res.json())
    setCommentsLoaded(true)
  }

  async function toggleComments() {
    if (!showComments) await loadComments()
    setShowComments((v) => !v)
  }

  async function handleLike() {
    if (!token || liking) return
    setLiking(true)
    try {
      const res = await fetch(`${API}/posts/${post.id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const { liked } = await res.json()
        onLike(post.id, liked)
      }
    } finally {
      setLiking(false)
    }
  }

  async function submitComment() {
    if (!token || !commentText.trim()) return
    const res = await fetch(`${API}/posts/${post.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content: commentText }),
    })
    if (res.ok) {
      const comment = await res.json()
      setComments((c) => [comment, ...c])
      setCommentText('')
    }
  }

  return (
    <article className="rounded-xl border border-metal-700 bg-metal-900">
      {/* Author header */}
      <div className="flex items-center gap-3 p-4">
        <Link href={profileHref} className="flex-shrink-0">
          <div className="h-10 w-10 rounded-full overflow-hidden bg-metal-700 flex items-center justify-center text-sm font-bold text-metal-400">
            {authorAvatar ? (
              <img src={authorAvatar} alt={authorName} className="h-full w-full object-cover" />
            ) : (
              authorName[0]
            )}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={profileHref} className="font-semibold text-sm hover:text-orange-400">
            {authorName}
          </Link>
          {post.authorProfile?.primarySpecialty && (
            <p className="text-xs text-metal-500">
              {SPECIALTY_LABELS[post.authorProfile.primarySpecialty] ?? post.authorProfile.primarySpecialty}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="rounded bg-metal-700 px-2 py-0.5 text-xs text-metal-400">
            {POST_TYPE_LABELS[post.postType] ?? post.postType}
          </span>
          <span className="text-xs text-metal-600">{timeAgo(post.createdAt)}</span>
        </div>
      </div>

      {/* Content */}
      {post.contentText && (
        <p className="px-4 pb-3 text-sm text-metal-200 whitespace-pre-wrap">{post.contentText}</p>
      )}

      {/* Media */}
      {post.media.length > 0 && (
        <div className={`grid gap-1 ${post.media.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {post.media.map((m, i) => (
            <div key={i} className="relative overflow-hidden bg-metal-800 aspect-video">
              {m.type === 'image' ? (
                <img src={m.url} alt={m.caption ?? ''} className="h-full w-full object-cover" />
              ) : (
                <video src={m.url} poster={m.thumbnailUrl} controls className="h-full w-full" />
              )}
              {m.caption && (
                <p className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 text-xs text-white">
                  {m.caption}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 border-t border-metal-800 px-4 py-2">
        <button
          onClick={handleLike}
          disabled={!token || liking}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            post.isLikedByCurrentUser ? 'text-orange-400' : 'text-metal-500 hover:text-white'
          } disabled:opacity-50`}
        >
          <span>{post.isLikedByCurrentUser ? '♥' : '♡'}</span>
          <span>{post.likeCount}</span>
        </button>
        <button
          onClick={toggleComments}
          className="flex items-center gap-1.5 text-sm text-metal-500 hover:text-white transition-colors"
        >
          <span>💬</span>
          <span>{post.commentCount}</span>
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div className="border-t border-metal-800 px-4 py-3 space-y-3">
          {token && (
            <div className="flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && submitComment()}
                placeholder="Escreve um comentário..."
                maxLength={500}
                className="flex-1 rounded-lg border border-metal-700 bg-metal-800 px-3 py-2 text-xs text-white placeholder-metal-500 focus:border-orange-500 focus:outline-none"
              />
              <button
                onClick={submitComment}
                disabled={!commentText.trim()}
                className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                Enviar
              </button>
            </div>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className="h-7 w-7 shrink-0 rounded-full bg-metal-700 flex items-center justify-center text-xs font-bold text-metal-400">
                {c.authorProfile?.fullName?.[0] ?? '?'}
              </div>
              <div className="flex-1 rounded-lg bg-metal-800 px-3 py-2">
                <p className="text-xs font-medium text-metal-300">{c.authorProfile?.fullName ?? 'Utilizador'}</p>
                <p className="text-xs text-metal-200">{c.content}</p>
              </div>
            </div>
          ))}
          {comments.length === 0 && commentsLoaded && (
            <p className="text-xs text-metal-600">Sem comentários ainda.</p>
          )}
        </div>
      )}
    </article>
  )
}

function CreatePostModal({
  token,
  onCreated,
  onClose,
}: {
  token: string
  onCreated: (post: Post) => void
  onClose: () => void
}) {
  const [contentText, setContentText] = useState('')
  const [postType, setPostType] = useState<string>('general')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!contentText.trim()) { setError('Escreve algo antes de publicar.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ contentText, postType, visibility: 'public' }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.message ?? 'Erro'); return }
      const post = await res.json()
      onCreated(post)
    } catch {
      setError('Erro de rede.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-xl border border-metal-700 bg-metal-900 p-6">
        <h2 className="mb-4 text-lg font-semibold">Novo post</h2>
        <select
          value={postType}
          onChange={(e) => setPostType(e.target.value)}
          className="mb-3 w-full rounded-lg border border-metal-700 bg-metal-800 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
        >
          {Object.entries(POST_TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <textarea
          value={contentText}
          onChange={(e) => setContentText(e.target.value)}
          rows={5}
          maxLength={2000}
          placeholder="Partilha algo com a comunidade metalomecânica..."
          className="w-full rounded-lg border border-metal-700 bg-metal-800 p-3 text-sm text-white placeholder-metal-500 focus:border-orange-500 focus:outline-none resize-none"
          autoFocus
        />
        <p className="mt-1 text-right text-xs text-metal-600">{contentText.length}/2000</p>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        <div className="mt-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-metal-700 py-2.5 text-sm font-medium text-metal-300 hover:border-metal-500 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !contentText.trim()}
            className="flex-1 rounded-lg bg-orange-500 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {loading ? 'A publicar...' : 'Publicar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function FeedPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string>('')
  const observerRef = useRef<IntersectionObserver | null>(null)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setToken(localStorage.getItem('mc_token'))
  }, [])

  const loadPosts = useCallback(async (cursor?: string, filter?: string) => {
    if (loading) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (cursor) params.set('cursor', cursor)
      if (filter) params.set('postType', filter)
      params.set('pageSize', '15')

      const headers: HeadersInit = {}
      const t = localStorage.getItem('mc_token')
      if (t) headers['Authorization'] = `Bearer ${t}`

      const res = await fetch(`${API}/feed?${params.toString()}`, { headers })
      if (!res.ok) return
      const data = await res.json()

      setPosts((prev) => cursor ? [...prev, ...data.data] : data.data)
      setNextCursor(data.nextCursor)
      setHasMore(data.hasMore)
    } finally {
      setLoading(false)
    }
  }, [loading])

  useEffect(() => {
    loadPosts(undefined, activeFilter)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter])

  // Infinite scroll sentinel
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect()
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasMore && !loading && nextCursor) {
        loadPosts(nextCursor, activeFilter)
      }
    }, { threshold: 0.5 })
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current)
    return () => observerRef.current?.disconnect()
  }, [hasMore, loading, nextCursor, activeFilter, loadPosts])

  function handleLike(postId: string, liked: boolean) {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, isLikedByCurrentUser: liked, likeCount: p.likeCount + (liked ? 1 : -1) }
          : p
      )
    )
  }

  function handleCreated(post: Post) {
    setPosts((prev) => [post, ...prev])
    setShowCreate(false)
  }

  function changeFilter(f: string) {
    setActiveFilter(f)
    setPosts([])
    setNextCursor(null)
    setHasMore(true)
  }

  const filters = [
    { value: '', label: 'Tudo' },
    { value: 'portfolio_work', label: 'Portfólio' },
    { value: 'job_update', label: 'Trabalhos' },
    { value: 'certification', label: 'Certificações' },
    { value: 'news', label: 'Novidades' },
  ]

  return (
    <div className="min-h-screen bg-metal-950 text-white">
      <Navbar isAuthenticated={!!token} />

      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Create post */}
        {token && (
          <button
            onClick={() => setShowCreate(true)}
            className="mb-6 w-full rounded-xl border border-metal-700 bg-metal-900 px-4 py-3 text-left text-sm text-metal-500 hover:border-orange-500/50 hover:bg-metal-800 transition-all"
          >
            Partilha algo com a comunidade...
          </button>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => changeFilter(f.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeFilter === f.value
                  ? 'bg-orange-500 text-white'
                  : 'border border-metal-700 text-metal-400 hover:border-metal-500 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Posts */}
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} token={token} onLike={handleLike} />
          ))}

          {/* Loading */}
          {loading && (
            <div className="py-8 text-center text-sm text-metal-500">A carregar...</div>
          )}

          {/* Empty state */}
          {!loading && posts.length === 0 && (
            <div className="rounded-xl border border-metal-700 bg-metal-900 p-10 text-center">
              <p className="text-metal-400">O feed está vazio.</p>
              {token ? (
                <button
                  onClick={() => setShowCreate(true)}
                  className="mt-3 inline-block rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold hover:bg-orange-600 transition-colors"
                >
                  Sê o primeiro a publicar
                </button>
              ) : (
                <Link href="/register" className="mt-3 inline-block rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold hover:bg-orange-600 transition-colors">
                  Junta-te à comunidade
                </Link>
              )}
            </div>
          )}

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-4" />

          {!hasMore && posts.length > 0 && (
            <p className="py-4 text-center text-xs text-metal-600">Chegaste ao fim do feed.</p>
          )}
        </div>
      </div>

      {showCreate && token && (
        <CreatePostModal token={token} onCreated={handleCreated} onClose={() => setShowCreate(false)} />
      )}
    </div>
  )
}
