import { prisma } from '../../lib/prisma.js'
import { z } from 'zod'

export const SendMessageSchema = z.object({
  recipientUserId: z.string().uuid(),
  content: z.string().min(1).max(4000),
  attachmentUrl: z.string().url().optional().nullable(),
})

export const GetMessagesSchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.number().int().min(1).max(100).default(30),
})

export type SendMessageInput = z.infer<typeof SendMessageSchema>
export type GetMessagesInput = z.infer<typeof GetMessagesSchema>

export class MessagesService {
  /**
   * Get or create a conversation between two users.
   * The two participants are stored in canonical order (lower UUID first)
   * to ensure the UNIQUE constraint always hits.
   */
  private async getOrCreateConversation(userA: string, userB: string) {
    const [a, b] = [userA, userB].sort()

    const existing = await prisma.conversation.findFirst({
      where: { participantA: a, participantB: b },
    })
    if (existing) return existing

    return prisma.conversation.create({
      data: { participantA: a, participantB: b },
    })
  }

  async sendMessage(senderId: string, input: SendMessageInput) {
    const recipient = await prisma.user.findUnique({ where: { id: input.recipientUserId } })
    if (!recipient || recipient.deletedAt) {
      throw { statusCode: 404, message: 'Destinatário não encontrado.' }
    }

    const conversation = await this.getOrCreateConversation(senderId, input.recipientUserId)

    const [message] = await prisma.$transaction([
      prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId,
          content: input.content,
          attachmentUrl: input.attachmentUrl ?? undefined,
        },
        include: {
          sender: {
            select: {
              id: true,
              accountType: true,
              workerProfile: { select: { fullName: true, slug: true, avatarUrl: true } },
              companyProfile: { select: { companyName: true, slug: true, logoUrl: true } },
            },
          },
        },
      }),
      prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt: new Date(),
          lastMessagePreview: input.content.slice(0, 100),
        },
      }),
    ])

    return { message, conversationId: conversation.id }
  }

  async getConversations(userId: string) {
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [{ participantA: userId }, { participantB: userId }],
      },
      orderBy: { lastMessageAt: 'desc' },
    })

    return Promise.all(
      conversations.map(async (conv) => {
        const otherUserId = conv.participantA === userId ? conv.participantB : conv.participantA
        const otherUser = await prisma.user.findUnique({
          where: { id: otherUserId },
          include: {
            workerProfile: { select: { fullName: true, slug: true, avatarUrl: true } },
            companyProfile: { select: { companyName: true, slug: true, logoUrl: true } },
          },
        })

        const unreadCount = await prisma.message.count({
          where: { conversationId: conv.id, senderId: { not: userId }, isRead: false },
        })

        return {
          ...conv,
          otherUser,
          unreadCount,
        }
      })
    )
  }

  async getMessages(userId: string, conversationId: string, input: GetMessagesInput) {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ participantA: userId }, { participantB: userId }],
      },
    })
    if (!conversation) throw { statusCode: 404, message: 'Conversa não encontrada.' }

    const { cursor, pageSize } = input

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        deletedAt: null,
        ...(cursor && { createdAt: { lt: new Date(cursor) } }),
      },
      orderBy: { createdAt: 'desc' },
      take: pageSize + 1,
      include: {
        sender: {
          select: {
            id: true,
            accountType: true,
            workerProfile: { select: { fullName: true, slug: true, avatarUrl: true } },
            companyProfile: { select: { companyName: true, slug: true, logoUrl: true } },
          },
        },
      },
    })

    const hasMore = messages.length > pageSize
    const data = messages.slice(0, pageSize).reverse()

    // Mark unread messages as read
    await prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, isRead: false },
      data: { isRead: true, readAt: new Date() },
    })

    const nextCursor = hasMore ? messages[pageSize - 1]?.createdAt.toISOString() ?? null : null
    return { data, hasMore, nextCursor }
  }

  async getConversationWithUser(userId: string, otherUserId: string) {
    const [a, b] = [userId, otherUserId].sort()
    const conversation = await prisma.conversation.findFirst({
      where: { participantA: a, participantB: b },
    })
    if (!conversation) return null
    return conversation
  }
}
