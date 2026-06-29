import type { Server as HttpServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'

export function createSocketServer(httpServer: HttpServer, fastify: FastifyInstance): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: [fastify.config.frontendUrl, /localhost:\d+/],
      credentials: true,
    },
    path: '/socket.io',
  })

  // JWT authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined
    if (!token) return next(new Error('Authentication required'))

    try {
      const payload = fastify.jwt.verify<{ sub: string; accountType: string }>(token)
      socket.data.userId = payload.sub
      socket.data.accountType = payload.accountType
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', async (socket) => {
    const userId = socket.data.userId as string
    fastify.log.debug(`Socket connected: ${userId}`)

    // Each user joins their personal room for receiving messages
    socket.join(`user:${userId}`)

    // Join conversation rooms for all existing conversations
    const conversations = await prisma.conversation.findMany({
      where: { OR: [{ participantA: userId }, { participantB: userId }] },
      select: { id: true },
    })
    for (const conv of conversations) {
      socket.join(`conv:${conv.id}`)
    }

    // Client sends a message via socket for real-time delivery
    socket.on('message:send', async (data: { recipientUserId: string; content: string; attachmentUrl?: string }) => {
      try {
        const recipient = await prisma.user.findUnique({ where: { id: data.recipientUserId } })
        if (!recipient) return

        const [a, b] = [userId, data.recipientUserId].sort()
        let conversation = await prisma.conversation.findFirst({
          where: { participantA: a, participantB: b },
        })
        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: { participantA: a, participantB: b },
          })
        }

        const [message] = await prisma.$transaction([
          prisma.message.create({
            data: {
              conversationId: conversation.id,
              senderId: userId,
              content: data.content,
              attachmentUrl: data.attachmentUrl,
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
              lastMessagePreview: data.content.slice(0, 100),
            },
          }),
        ])

        const payload = { message, conversationId: conversation.id }

        // Deliver to both participants' rooms
        io.to(`user:${userId}`).to(`user:${data.recipientUserId}`).emit('message:new', payload)

        // Ensure both are subscribed to the conversation room
        socket.join(`conv:${conversation.id}`)
        // The recipient will join on their next connection; no-op if already joined
      } catch (err) {
        fastify.log.error(err, 'Socket message error')
        socket.emit('message:error', { error: 'Erro ao enviar mensagem.' })
      }
    })

    // Typing indicator (lightweight, no DB)
    socket.on('typing:start', (data: { conversationId: string }) => {
      socket.to(`conv:${data.conversationId}`).emit('typing:start', { userId })
    })

    socket.on('typing:stop', (data: { conversationId: string }) => {
      socket.to(`conv:${data.conversationId}`).emit('typing:stop', { userId })
    })

    // Mark messages as read
    socket.on('messages:read', async (data: { conversationId: string }) => {
      await prisma.message.updateMany({
        where: { conversationId: data.conversationId, senderId: { not: userId }, isRead: false },
        data: { isRead: true, readAt: new Date() },
      })
      socket.to(`conv:${data.conversationId}`).emit('messages:read', { userId, conversationId: data.conversationId })
    })

    socket.on('disconnect', () => {
      fastify.log.debug(`Socket disconnected: ${userId}`)
    })
  })

  return io
}
