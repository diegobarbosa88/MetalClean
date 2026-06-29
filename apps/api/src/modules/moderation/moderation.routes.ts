import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'

export async function moderationRoutes(fastify: FastifyInstance) {
  // Fila de denúncias pendentes (admin)
  fastify.get('/admin/moderation', {
    schema: {
      tags: ['Moderation'],
      summary: 'Fila de moderação (admin)',
      security: [{ bearerAuth: [] }],
      querystring: z.object({
        status: z.enum(['pending', 'under_review', 'resolved_kept', 'resolved_removed', 'escalated']).optional().default('pending'),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(50).default(20),
      }),
    },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      if (request.user.accountType !== 'admin') {
        return reply.code(403).send({ message: 'Acesso restrito a administradores.' })
      }

      const { status, page, pageSize } = request.query as { status: string; page: number; pageSize: number }
      const skip = (page - 1) * pageSize

      const [data, total] = await Promise.all([
        prisma.moderationReport.findMany({
          where: { status },
          skip,
          take: pageSize,
          orderBy: { createdAt: 'asc' },
          include: {
            reporter: { select: { id: true, email: true, accountType: true } },
            resolvedBy: { select: { id: true, email: true } },
          },
        }),
        prisma.moderationReport.count({ where: { status } }),
      ])

      return { data, total, page, pageSize, hasMore: skip + data.length < total }
    },
  })

  // Resolver uma denúncia (admin)
  fastify.put('/admin/moderation/:reportId', {
    schema: {
      tags: ['Moderation'],
      summary: 'Resolver denúncia (admin)',
      security: [{ bearerAuth: [] }],
      params: z.object({ reportId: z.string().uuid() }),
      body: z.object({
        action: z.enum(['resolved_kept', 'resolved_removed', 'escalated', 'under_review']),
        resolutionNotes: z.string().max(2000).optional(),
      }),
    },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      if (request.user.accountType !== 'admin') {
        return reply.code(403).send({ message: 'Acesso restrito a administradores.' })
      }

      const { reportId } = request.params as { reportId: string }
      const { action, resolutionNotes } = request.body as { action: string; resolutionNotes?: string }

      const report = await prisma.moderationReport.findUnique({ where: { id: reportId } })
      if (!report) return reply.code(404).send({ message: 'Denúncia não encontrada.' })

      await prisma.$transaction(async (tx) => {
        await tx.moderationReport.update({
          where: { id: reportId },
          data: {
            status: action,
            resolvedById: request.user.sub,
            resolutionNotes,
            resolvedAt: new Date(),
          },
        })

        // Se ação é "remover", ocultar o conteúdo denunciado
        if (action === 'resolved_removed') {
          if (report.targetType === 'review') {
            await tx.review.update({
              where: { id: report.targetId },
              data: { status: 'removed', isVisible: false },
            })
          } else if (report.targetType === 'post') {
            await tx.post.update({
              where: { id: report.targetId },
              data: { moderationStatus: 'removed' },
            })
          } else if (report.targetType === 'comment') {
            await tx.postComment.update({
              where: { id: report.targetId },
              data: { moderationStatus: 'removed' },
            })
          }
        }

        // Se ação é "manter", restaurar visibilidade
        if (action === 'resolved_kept' && report.targetType === 'review') {
          await tx.review.update({
            where: { id: report.targetId },
            data: { status: 'published', isVisible: true },
          })
        }
      })

      return { success: true, action }
    },
  })

  // Denúncias por conteúdo específico (contexto)
  fastify.get('/admin/moderation/:reportId', {
    schema: {
      tags: ['Moderation'],
      summary: 'Detalhe de denúncia (admin)',
      security: [{ bearerAuth: [] }],
      params: z.object({ reportId: z.string().uuid() }),
    },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      if (request.user.accountType !== 'admin') {
        return reply.code(403).send({ message: 'Acesso restrito a administradores.' })
      }

      const { reportId } = request.params as { reportId: string }
      const report = await prisma.moderationReport.findUnique({
        where: { id: reportId },
        include: {
          reporter: { select: { id: true, email: true, accountType: true } },
        },
      })
      if (!report) return reply.code(404).send({ message: 'Denúncia não encontrada.' })

      // Carregar o conteúdo alvo
      let target: unknown = null
      if (report.targetType === 'review') {
        target = await prisma.review.findUnique({
          where: { id: report.targetId },
          include: {
            reviewerUser: { select: { id: true, email: true } },
            revieweeUser: { select: { id: true, email: true } },
          },
        })
      } else if (report.targetType === 'post') {
        target = await prisma.post.findUnique({ where: { id: report.targetId } })
      }

      return { report, target }
    },
  })
}
