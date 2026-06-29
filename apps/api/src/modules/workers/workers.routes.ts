import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  UpdateWorkerProfileSchema,
  AddCertificationSchema,
  WorkerSearchSchema,
} from '@metalclean/validators/worker'
import { WorkersService } from './workers.service.js'

export async function workersRoutes(fastify: FastifyInstance) {
  const svc = new WorkersService()

  // Public: search workers
  fastify.get('/workers', {
    schema: { tags: ['Workers'], summary: 'Pesquisar trabalhadores', querystring: WorkerSearchSchema },
    handler: async (request) => svc.search(request.query),
  })

  // Public: get worker profile by slug
  fastify.get('/workers/:slug', {
    schema: { tags: ['Workers'], summary: 'Perfil público do trabalhador', params: z.object({ slug: z.string() }) },
    handler: async (request) => {
      const { slug } = request.params as { slug: string }
      const userId = (request.user as { sub?: string } | undefined)?.sub
      return svc.getProfile(slug, userId)
    },
  })

  // Authenticated: update own profile
  fastify.put('/workers/me', {
    schema: { tags: ['Workers'], summary: 'Atualizar perfil', security: [{ bearerAuth: [] }], body: UpdateWorkerProfileSchema },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const result = await svc.updateProfile(request.user.sub, request.body)
      return reply.send(result)
    },
  })

  // Authenticated: add certification
  fastify.post('/workers/me/certifications', {
    schema: { tags: ['Workers'], summary: 'Adicionar certificação', security: [{ bearerAuth: [] }], body: AddCertificationSchema },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const cert = await svc.addCertification(request.user.sub, request.body)
      return reply.code(201).send(cert)
    },
  })

  // Authenticated: remove certification
  fastify.delete('/workers/me/certifications/:certId', {
    schema: {
      tags: ['Workers'],
      summary: 'Remover certificação',
      security: [{ bearerAuth: [] }],
      params: z.object({ certId: z.string().uuid() }),
    },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const { certId } = request.params as { certId: string }
      const result = await svc.removeCertification(request.user.sub, certId)
      return reply.send(result)
    },
  })
}
