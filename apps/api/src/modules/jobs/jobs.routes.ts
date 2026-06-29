import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { CreateJobSchema, UpdateJobStatusSchema, JobSearchSchema } from '@metalclean/validators/job'
import { JobsService } from './jobs.service.js'

export async function jobsRoutes(fastify: FastifyInstance) {
  const svc = new JobsService()

  // Public: search jobs (SEO-friendly, no auth required)
  fastify.get('/jobs', {
    schema: { tags: ['Jobs'], summary: 'Pesquisar vagas', querystring: JobSearchSchema },
    handler: async (request) => svc.search(request.query),
  })

  // Public: get job by slug
  fastify.get('/jobs/slug/:slug', {
    schema: { tags: ['Jobs'], summary: 'Vaga por slug', params: z.object({ slug: z.string() }) },
    handler: async (request) => {
      const { slug } = request.params as { slug: string }
      return svc.getBySlug(slug)
    },
  })

  // Auth: company lists own jobs (must be before /:id to avoid param conflict)
  fastify.get('/jobs/mine', {
    schema: { tags: ['Jobs'], summary: 'As minhas vagas', security: [{ bearerAuth: [] }] },
    onRequest: [fastify.authenticate],
    handler: async (request) => svc.getMyJobs(request.user.sub),
  })

  // Public/Auth: get job by id
  fastify.get('/jobs/:id', {
    schema: { tags: ['Jobs'], summary: 'Detalhe da vaga', params: z.object({ id: z.string().uuid() }) },
    handler: async (request) => {
      const { id } = request.params as { id: string }
      const userId = (request.user as { sub?: string } | undefined)?.sub
      return svc.getById(id, userId)
    },
  })

  // Auth: company creates job posting
  fastify.post('/jobs', {
    schema: { tags: ['Jobs'], summary: 'Criar vaga', security: [{ bearerAuth: [] }], body: CreateJobSchema },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      if (request.user.accountType !== 'company') {
        return reply.code(403).send({ message: 'Apenas empresas podem publicar vagas.' })
      }
      const job = await svc.create(request.user.sub, request.body)
      return reply.code(201).send(job)
    },
  })

  // Auth: company updates job status
  fastify.put('/jobs/:id/status', {
    schema: {
      tags: ['Jobs'],
      summary: 'Atualizar estado da vaga',
      security: [{ bearerAuth: [] }],
      params: z.object({ id: z.string().uuid() }),
      body: UpdateJobStatusSchema,
    },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await svc.updateStatus(request.user.sub, id, request.body)
      return reply.send(result)
    },
  })

  // Auth: company deletes job
  fastify.delete('/jobs/:id', {
    schema: {
      tags: ['Jobs'],
      summary: 'Apagar vaga',
      security: [{ bearerAuth: [] }],
      params: z.object({ id: z.string().uuid() }),
    },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }
      await svc.softDelete(request.user.sub, id)
      return reply.code(204).send()
    },
  })
}
