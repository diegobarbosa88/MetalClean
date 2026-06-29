import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { MessagesService, SendMessageSchema, GetMessagesSchema } from './messages.service.js'

export async function messagesRoutes(fastify: FastifyInstance) {
  const svc = new MessagesService()

  // List conversations for current user
  fastify.get('/messages', {
    schema: { tags: ['Messages'], summary: 'Lista de conversas', security: [{ bearerAuth: [] }] },
    onRequest: [fastify.authenticate],
    handler: async (request) => svc.getConversations(request.user.sub),
  })

  // Send message (creates conversation if needed)
  fastify.post('/messages', {
    schema: {
      tags: ['Messages'],
      summary: 'Enviar mensagem',
      security: [{ bearerAuth: [] }],
      body: SendMessageSchema,
    },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const result = await svc.sendMessage(request.user.sub, request.body)
      return reply.code(201).send(result)
    },
  })

  // Get messages in a conversation (cursor pagination)
  fastify.get('/messages/:conversationId', {
    schema: {
      tags: ['Messages'],
      summary: 'Mensagens de uma conversa',
      security: [{ bearerAuth: [] }],
      params: z.object({ conversationId: z.string().uuid() }),
      querystring: GetMessagesSchema,
    },
    onRequest: [fastify.authenticate],
    handler: async (request) => {
      const { conversationId } = request.params as { conversationId: string }
      return svc.getMessages(request.user.sub, conversationId, request.query as { cursor?: string; pageSize: number })
    },
  })

  // Start a conversation with a specific user (find or create)
  fastify.get('/messages/with/:userId', {
    schema: {
      tags: ['Messages'],
      summary: 'Conversa com utilizador',
      security: [{ bearerAuth: [] }],
      params: z.object({ userId: z.string().uuid() }),
    },
    onRequest: [fastify.authenticate],
    handler: async (request) => {
      const { userId } = request.params as { userId: string }
      return svc.getConversationWithUser(request.user.sub, userId)
    },
  })
}
