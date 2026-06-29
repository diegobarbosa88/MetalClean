import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { CreateMatchSchema, CompleteMatchSchema, CancelMatchSchema } from '@metalclean/validators/match'
import { MatchesService } from './matches.service.js'

export async function matchesRoutes(fastify: FastifyInstance) {
  const svc = new MatchesService()

  // Company: create match invite
  fastify.post('/matches', {
    schema: { tags: ['Matches'], summary: 'Criar convite de contrato', security: [{ bearerAuth: [] }], body: CreateMatchSchema },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      if (request.user.accountType !== 'company') {
        return reply.code(403).send({ message: 'Apenas empresas podem iniciar contratos.' })
      }
      const match = await svc.create(request.user.sub, request.body)
      return reply.code(201).send(match)
    },
  })

  // Worker: accept match invite
  fastify.put('/matches/:id/accept', {
    schema: {
      tags: ['Matches'],
      summary: 'Aceitar convite de contrato',
      security: [{ bearerAuth: [] }],
      params: z.object({ id: z.string().uuid() }),
    },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      if (request.user.accountType !== 'worker') {
        return reply.code(403).send({ message: 'Apenas trabalhadores podem aceitar contratos.' })
      }
      const { id } = request.params as { id: string }
      const match = await svc.accept(request.user.sub, id)
      return reply.send(match)
    },
  })

  // Either party: complete match
  fastify.put('/matches/:id/complete', {
    schema: {
      tags: ['Matches'],
      summary: 'Concluir contrato',
      security: [{ bearerAuth: [] }],
      params: z.object({ id: z.string().uuid() }),
      body: CompleteMatchSchema,
    },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }
      const match = await svc.complete(request.user.sub, id, request.body)
      return reply.send(match)
    },
  })

  // Either party: cancel match
  fastify.put('/matches/:id/cancel', {
    schema: {
      tags: ['Matches'],
      summary: 'Cancelar contrato',
      security: [{ bearerAuth: [] }],
      params: z.object({ id: z.string().uuid() }),
      body: CancelMatchSchema,
    },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }
      const match = await svc.cancel(request.user.sub, id, request.body)
      return reply.send(match)
    },
  })

  // Auth: get match detail
  fastify.get('/matches/:id', {
    schema: {
      tags: ['Matches'],
      summary: 'Detalhe do contrato',
      security: [{ bearerAuth: [] }],
      params: z.object({ id: z.string().uuid() }),
    },
    onRequest: [fastify.authenticate],
    handler: async (request) => {
      const { id } = request.params as { id: string }
      return svc.getById(request.user.sub, id)
    },
  })

  // Auth: list my matches
  fastify.get('/matches', {
    schema: { tags: ['Matches'], summary: 'Os meus contratos', security: [{ bearerAuth: [] }] },
    onRequest: [fastify.authenticate],
    handler: async (request) => svc.getMyMatches(request.user.sub),
  })
}
