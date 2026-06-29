import type { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma.js'

export async function analyticsRoutes(fastify: FastifyInstance) {
  // Dashboard de analytics da empresa
  fastify.get('/analytics/company', {
    schema: { tags: ['Analytics'], summary: 'Analytics da empresa', security: [{ bearerAuth: [] }] },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      if (request.user.accountType !== 'company') {
        return reply.code(403).send({ message: 'Apenas empresas têm analytics.' })
      }

      const company = await prisma.companyProfile.findUnique({
        where: { userId: request.user.sub },
        select: { id: true },
      })
      if (!company) return reply.code(404).send({ message: 'Empresa não encontrada.' })

      const [jobs, totalApplications, matchStats, reviewStats] = await Promise.all([
        // Vagas com contagens de candidaturas por estado
        prisma.jobPosting.findMany({
          where: { companyId: company.id, deletedAt: null },
          select: {
            id: true, title: true, status: true, publishedAt: true, viewCount: true,
            _count: { select: { applications: true } },
            applications: {
              select: { status: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        }),

        // Total de candidaturas
        prisma.jobApplication.count({
          where: { job: { companyId: company.id } },
        }),

        // Estatísticas de matches
        prisma.match.groupBy({
          by: ['status'],
          where: { companyId: company.id },
          _count: { id: true },
        }),

        // Score médio recebido
        prisma.review.aggregate({
          where: { revieweeUserId: request.user.sub, status: 'published', isVisible: true },
          _avg: { overallScore: true, scorePaymentPunctuality: true, scoreRateCompliance: true, scoreSafetyConditions: true },
          _count: { id: true },
        }),
      ])

      // Funil por vaga
      const jobFunnel = jobs.map((job) => {
        const apps = job.applications
        return {
          id: job.id,
          title: job.title,
          status: job.status,
          publishedAt: job.publishedAt,
          viewCount: job.viewCount,
          totalApplications: apps.length,
          pending: apps.filter((a) => a.status === 'pending').length,
          shortlisted: apps.filter((a) => a.status === 'shortlisted').length,
          rejected: apps.filter((a) => a.status === 'rejected').length,
          matched: apps.filter((a) => a.status === 'matched').length,
          conversionRate: apps.length > 0
            ? Math.round((apps.filter((a) => a.status === 'matched').length / apps.length) * 100)
            : 0,
        }
      })

      const matchStatusMap = Object.fromEntries(
        matchStats.map((s) => [s.status, s._count.id])
      )

      return {
        overview: {
          totalJobs: jobs.length,
          publishedJobs: jobs.filter((j) => j.status === 'published').length,
          totalApplications,
          activeMatches: matchStatusMap['active'] ?? 0,
          completedMatches: matchStatusMap['completed'] ?? 0,
        },
        reviews: {
          count: reviewStats._count.id,
          avgScore: reviewStats._avg.overallScore ? Number(reviewStats._avg.overallScore).toFixed(2) : null,
          avgPaymentPunctuality: reviewStats._avg.scorePaymentPunctuality,
          avgRateCompliance: reviewStats._avg.scoreRateCompliance,
          avgSafetyConditions: reviewStats._avg.scoreSafetyConditions,
        },
        jobFunnel,
      }
    },
  })

  // Estatísticas globais da plataforma (admin)
  fastify.get('/analytics/platform', {
    schema: { tags: ['Analytics'], summary: 'Estatísticas da plataforma (admin)', security: [{ bearerAuth: [] }] },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      if (request.user.accountType !== 'admin') {
        return reply.code(403).send({ message: 'Acesso restrito a administradores.' })
      }

      const [workers, companies, jobs, matches, reviews, reports] = await Promise.all([
        prisma.user.count({ where: { accountType: 'worker', deletedAt: null } }),
        prisma.user.count({ where: { accountType: 'company', deletedAt: null } }),
        prisma.jobPosting.count({ where: { status: 'published', deletedAt: null } }),
        prisma.match.count(),
        prisma.review.count({ where: { status: 'published' } }),
        prisma.moderationReport.count({ where: { status: 'pending' } }),
      ])

      return { workers, companies, jobs, matches, reviews, pendingReports: reports }
    },
  })
}
