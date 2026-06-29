import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import {
  SubmitWorkerReviewSchema,
  SubmitCompanyReviewSchema,
  ReviewResponseSchema,
  ReportReviewSchema,
} from '@metalclean/validators/review'
import { ReviewsService } from './reviews.service.js'

// Union discriminator: if the body has scoreAttendance, it's a worker review; otherwise company review
const SubmitReviewSchema = z.discriminatedUnion('reviewerType', [
  SubmitWorkerReviewSchema.extend({ reviewerType: z.literal('company') }),
  SubmitCompanyReviewSchema.extend({ reviewerType: z.literal('worker') }),
])

export async function reviewsRoutes(fastify: FastifyInstance) {
  const svc = new ReviewsService()

  // Submit a review (worker or company, determined by reviewerType in body)
  fastify.post('/reviews', {
    schema: {
      tags: ['Reviews'],
      summary: 'Submeter avaliação',
      security: [{ bearerAuth: [] }],
      body: SubmitReviewSchema,
    },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const review = await svc.submit(request.user.sub, request.body)
      return reply.code(201).send(review)
    },
  })

  // Respond to a review (public rebuttal)
  fastify.put('/reviews/:id/respond', {
    schema: {
      tags: ['Reviews'],
      summary: 'Responder a avaliação',
      security: [{ bearerAuth: [] }],
      params: z.object({ id: z.string().uuid() }),
      body: ReviewResponseSchema,
    },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await svc.respond(request.user.sub, id, request.body)
      return reply.send(result)
    },
  })

  // Report a review for moderation
  fastify.post('/reviews/:id/report', {
    schema: {
      tags: ['Reviews'],
      summary: 'Denunciar avaliação',
      security: [{ bearerAuth: [] }],
      params: z.object({ id: z.string().uuid() }),
      body: ReportReviewSchema,
    },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }
      const report = await svc.report(request.user.sub, id, request.body)
      return reply.code(201).send(report)
    },
  })

  // Get reviews for a user profile
  fastify.get('/reviews/user/:userId', {
    schema: {
      tags: ['Reviews'],
      summary: 'Avaliações de um utilizador',
      params: z.object({ userId: z.string().uuid() }),
    },
    handler: async (request) => {
      const { userId } = request.params as { userId: string }
      const viewerId = (request.user as { sub?: string } | undefined)?.sub
      return svc.getForProfile(userId, viewerId)
    },
  })
}
