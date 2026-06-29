import { prisma } from '../../lib/prisma.js'
import type { CreatePostInput, CreateCommentInput, ReportContentInput } from '@metalclean/validators/post'
import { z } from 'zod'

export const FeedQuerySchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.number().int().min(1).max(50).default(20),
  postType: z.enum(['general', 'portfolio_work', 'job_update', 'news', 'certification']).optional(),
  authorId: z.string().uuid().optional(),
})

export type FeedQuery = z.infer<typeof FeedQuerySchema>

export class PostsService {
  async create(userId: string, input: CreatePostInput) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { accountType: true } })
    if (!user) throw { statusCode: 401, message: 'Utilizador não encontrado.' }

    const post = await prisma.post.create({
      data: {
        authorUserId: userId,
        authorType: user.accountType === 'admin' ? 'worker' : user.accountType,
        contentText: input.contentText ?? undefined,
        postType: input.postType,
        media: input.media ?? [],
        visibility: input.visibility,
      },
      include: {
        author: {
          select: { id: true, accountType: true },
        },
      },
    })

    return post
  }

  async getFeed(userId: string | undefined, query: FeedQuery) {
    const { cursor, pageSize, postType, authorId } = query

    const where: Parameters<typeof prisma.post.findMany>[0]['where'] = {
      deletedAt: null,
      moderationStatus: 'ok',
      visibility: 'public',
      ...(postType && { postType }),
      ...(authorId && { authorUserId: authorId }),
      ...(cursor && { createdAt: { lt: new Date(cursor) } }),
    }

    const posts = await prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: pageSize + 1,
      include: {
        author: { select: { id: true, accountType: true } },
        likes: userId ? { where: { userId }, select: { userId: true } } : false,
      },
    })

    const hasMore = posts.length > pageSize
    const data = posts.slice(0, pageSize)

    // Enrich author data (worker or company profile)
    const enriched = await Promise.all(
      data.map(async (post) => {
        let authorProfile = null
        if (post.authorType === 'worker') {
          authorProfile = await prisma.workerProfile.findUnique({
            where: { userId: post.authorUserId },
            select: { fullName: true, slug: true, avatarUrl: true, primarySpecialty: true },
          })
        } else {
          authorProfile = await prisma.companyProfile.findUnique({
            where: { userId: post.authorUserId },
            select: { companyName: true, slug: true, logoUrl: true },
          })
        }
        return {
          ...post,
          authorProfile,
          isLikedByCurrentUser: userId ? post.likes?.some((l) => l.userId === userId) : false,
        }
      })
    )

    const nextCursor = hasMore ? data[data.length - 1]?.createdAt.toISOString() ?? null : null
    return { data: enriched, nextCursor, hasMore }
  }

  async like(userId: string, postId: string) {
    const post = await prisma.post.findUnique({ where: { id: postId } })
    if (!post || post.deletedAt) throw { statusCode: 404, message: 'Post não encontrado.' }

    const existing = await prisma.postLike.findUnique({ where: { postId_userId: { postId, userId } } })
    if (existing) {
      await prisma.$transaction([
        prisma.postLike.delete({ where: { postId_userId: { postId, userId } } }),
        prisma.post.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } }),
      ])
      return { liked: false }
    }

    await prisma.$transaction([
      prisma.postLike.create({ data: { postId, userId } }),
      prisma.post.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } }),
    ])
    return { liked: true }
  }

  async addComment(userId: string, postId: string, input: CreateCommentInput) {
    const post = await prisma.post.findUnique({ where: { id: postId } })
    if (!post || post.deletedAt) throw { statusCode: 404, message: 'Post não encontrado.' }

    const [comment] = await prisma.$transaction([
      prisma.postComment.create({
        data: {
          postId,
          authorUserId: userId,
          content: input.content,
          parentId: input.parentId ?? undefined,
        },
        include: {
          author: { select: { id: true, accountType: true } },
        },
      }),
      prisma.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } }),
    ])

    return comment
  }

  async getComments(postId: string) {
    const comments = await prisma.postComment.findMany({
      where: { postId, deletedAt: null, moderationStatus: 'ok', parentId: null },
      orderBy: { createdAt: 'asc' },
      include: {
        replies: {
          where: { deletedAt: null, moderationStatus: 'ok' },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    // Enrich authors
    const enriched = await Promise.all(
      comments.map(async (c) => {
        const profile = await prisma.workerProfile.findUnique({
          where: { userId: c.authorUserId },
          select: { fullName: true, slug: true, avatarUrl: true },
        }).catch(() => null)
        return { ...c, authorProfile: profile }
      })
    )

    return enriched
  }

  async deletePost(userId: string, postId: string) {
    const post = await prisma.post.findFirst({ where: { id: postId, authorUserId: userId } })
    if (!post) throw { statusCode: 404, message: 'Post não encontrado.' }

    await prisma.post.update({ where: { id: postId }, data: { deletedAt: new Date() } })
    return { success: true }
  }

  async report(userId: string, input: ReportContentInput) {
    return prisma.moderationReport.create({
      data: {
        reporterUserId: userId,
        targetType: input.targetType,
        targetId: input.targetId,
        reason: input.reason,
        description: input.description ?? undefined,
      },
    })
  }
}
