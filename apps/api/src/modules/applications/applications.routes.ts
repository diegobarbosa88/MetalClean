import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { ApplicationsService, ApplySchema, UpdateApplicationSchema } from './applications.service.js'

export async function applicationsRoutes(fastify: FastifyInstance) {
  const svc = new ApplicationsService()

  // Worker: apply to a job
  fastify.post('/applications', {
    schema: { tags: ['Applications'], summary: 'Candidatar-se a uma vaga', security: [{ bearerAuth: [] }], body: ApplySchema },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      if (request.user.accountType !== 'worker') {
        return reply.code(403).send({ message: 'Apenas trabalhadores se podem candidatar.' })
      }
      const app = await svc.apply(request.user.sub, request.body)
      return reply.code(201).send(app)
    },
  })

  // Worker: view own applications (before /:id to avoid param conflict)
  fastify.get('/applications/mine', {
    schema: { tags: ['Applications'], summary: 'As minhas candidaturas', security: [{ bearerAuth: [] }] },
    onRequest: [fastify.authenticate],
    handler: async (request) => svc.getMine(request.user.sub),
  })

  // Company: view received applications (before /:id to avoid param conflict)
  fastify.get('/applications/received', {
    schema: {
      tags: ['Applications'],
      summary: 'Candidaturas recebidas',
      security: [{ bearerAuth: [] }],
      querystring: z.object({ jobId: z.string().uuid().optional(), status: z.string().optional() }),
    },
    onRequest: [fastify.authenticate],
    handler: async (request) => {
      const { jobId, status } = request.query as { jobId?: string; status?: string }
      return svc.getReceived(request.user.sub, jobId, status)
    },
  })

  // Worker: withdraw application
  fastify.put('/applications/:id/withdraw', {
    schema: {
      tags: ['Applications'],
      summary: 'Retirar candidatura',
      security: [{ bearerAuth: [] }],
      params: z.object({ id: z.string().uuid() }),
    },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await svc.withdraw(request.user.sub, id)
      return reply.send(result)
    },
  })

  // Company: update application status
  fastify.put('/applications/:id/status', {
    schema: {
      tags: ['Applications'],
      summary: 'Atualizar estado da candidatura',
      security: [{ bearerAuth: [] }],
      params: z.object({ id: z.string().uuid() }),
      body: UpdateApplicationSchema,
    },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await svc.updateStatus(request.user.sub, id, request.body)
      return reply.send(result)
    },
  })
}
