import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { GdprService } from './gdpr.service.js'

export async function gdprRoutes(fastify: FastifyInstance) {
  const svc = new GdprService()

  // Exportação de dados
  fastify.post('/gdpr/export', {
    schema: {
      tags: ['GDPR'],
      summary: 'Exportar os meus dados (portabilidade)',
      security: [{ bearerAuth: [] }],
    },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const result = await svc.requestExport(request.user.sub)
      return reply.code(202).send(result)
    },
  })

  // Pedido de eliminação de conta
  fastify.post('/gdpr/delete', {
    schema: {
      tags: ['GDPR'],
      summary: 'Solicitar eliminação de conta',
      security: [{ bearerAuth: [] }],
      body: z.object({ reason: z.string().max(500).optional() }),
    },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const { reason } = request.body as { reason?: string }
      const result = await svc.requestDeletion(request.user.sub, reason)
      return reply.code(202).send(result)
    },
  })

  // Histórico de pedidos RGPD do utilizador
  fastify.get('/gdpr/requests', {
    schema: {
      tags: ['GDPR'],
      summary: 'Os meus pedidos RGPD',
      security: [{ bearerAuth: [] }],
    },
    onRequest: [fastify.authenticate],
    handler: async (request) => svc.getRequests(request.user.sub),
  })

  // Admin: anonimizar utilizador manualmente
  fastify.post('/admin/gdpr/anonymize/:userId', {
    schema: {
      tags: ['GDPR'],
      summary: 'Anonimizar utilizador (admin)',
      security: [{ bearerAuth: [] }],
      params: z.object({ userId: z.string().uuid() }),
    },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      if (request.user.accountType !== 'admin') {
        return reply.code(403).send({ message: 'Acesso restrito a administradores.' })
      }
      const { userId } = request.params as { userId: string }
      await svc.anonymizeUser(userId)
      return { success: true }
    },
  })
}
