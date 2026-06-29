import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'

export async function notificationsRoutes(fastify: FastifyInstance) {
  // Get user notifications
  fastify.get('/notifications', {
    schema: {
      tags: ['Notifications'],
      summary: 'As minhas notificações',
      security: [{ bearerAuth: [] }],
      querystring: z.object({
        unreadOnly: z.boolean().optional().default(false),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(50).default(20),
      }),
    },
    onRequest: [fastify.authenticate],
    handler: async (request) => {
      const { unreadOnly, page, pageSize } = request.query as { unreadOnly: boolean; page: number; pageSize: number }
      const skip = (page - 1) * pageSize

      const where = {
        userId: request.user.sub,
        ...(unreadOnly && { isRead: false }),
      }

      const [data, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: pageSize,
        }),
        prisma.notification.count({ where }),
        prisma.notification.count({ where: { userId: request.user.sub, isRead: false } }),
      ])

      return { data, total, page, pageSize, hasMore: skip + data.length < total, unreadCount }
    },
  })

  // Mark notification(s) as read
  fastify.put('/notifications/read', {
    schema: {
      tags: ['Notifications'],
      summary: 'Marcar como lidas',
      security: [{ bearerAuth: [] }],
      body: z.object({
        ids: z.array(z.string().uuid()).optional(),
        all: z.boolean().optional().default(false),
      }),
    },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const { ids, all } = request.body as { ids?: string[]; all?: boolean }

      await prisma.notification.updateMany({
        where: {
          userId: request.user.sub,
          isRead: false,
          ...(all ? {} : { id: { in: ids ?? [] } }),
        },
        data: { isRead: true, readAt: new Date() },
      })

      return reply.send({ success: true })
    },
  })
}
