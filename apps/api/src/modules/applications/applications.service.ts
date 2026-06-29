import { prisma } from '../../lib/prisma.js'
import { z } from 'zod'

export const ApplySchema = z.object({
  jobId: z.string().uuid(),
  coverNote: z.string().max(500).optional().nullable(),
  proposedRate: z.number().min(1).max(500).optional().nullable(),
})

export const UpdateApplicationSchema = z.object({
  status: z.enum(['viewed', 'shortlisted', 'rejected']),
})

export type ApplyInput = z.infer<typeof ApplySchema>
export type UpdateApplicationInput = z.infer<typeof UpdateApplicationSchema>

export class ApplicationsService {
  async apply(userId: string, input: ApplyInput) {
    const worker = await prisma.workerProfile.findUnique({ where: { userId } })
    if (!worker) throw { statusCode: 403, message: 'Apenas trabalhadores se podem candidatar.' }

    const job = await prisma.jobPosting.findFirst({
      where: { id: input.jobId, status: 'published', deletedAt: null },
    })
    if (!job) throw { statusCode: 404, message: 'Vaga não encontrada ou já encerrada.' }

    const existing = await prisma.jobApplication.findFirst({
      where: { jobId: input.jobId, workerId: worker.id },
    })
    if (existing) throw { statusCode: 409, message: 'Já te candidataste a esta vaga.' }

    const [application] = await prisma.$transaction([
      prisma.jobApplication.create({
        data: {
          jobId: input.jobId,
          workerId: worker.id,
          coverNote: input.coverNote,
          proposedRate: input.proposedRate ?? undefined,
          status: 'pending',
        },
        include: {
          job: { select: { title: true, slug: true, company: { select: { companyName: true } } } },
        },
      }),
      prisma.jobPosting.update({
        where: { id: input.jobId },
        data: { applicationCount: { increment: 1 } },
      }),
    ])

    return application
  }

  async withdraw(userId: string, applicationId: string) {
    const worker = await prisma.workerProfile.findUnique({ where: { userId } })
    if (!worker) throw { statusCode: 403, message: 'Acesso negado.' }

    const app = await prisma.jobApplication.findFirst({
      where: { id: applicationId, workerId: worker.id },
    })
    if (!app) throw { statusCode: 404, message: 'Candidatura não encontrada.' }
    if (['matched', 'rejected'].includes(app.status)) {
      throw { statusCode: 400, message: 'Não é possível retirar esta candidatura.' }
    }

    return prisma.jobApplication.update({
      where: { id: applicationId },
      data: { status: 'withdrawn' },
    })
  }

  async updateStatus(userId: string, applicationId: string, input: UpdateApplicationInput) {
    const company = await prisma.companyProfile.findUnique({ where: { userId } })
    if (!company) throw { statusCode: 403, message: 'Acesso negado.' }

    const app = await prisma.jobApplication.findFirst({
      where: {
        id: applicationId,
        job: { companyId: company.id },
      },
    })
    if (!app) throw { statusCode: 404, message: 'Candidatura não encontrada.' }

    return prisma.jobApplication.update({
      where: { id: applicationId },
      data: { status: input.status },
    })
  }

  async getReceived(userId: string, jobId?: string, status?: string) {
    const company = await prisma.companyProfile.findUnique({ where: { userId } })
    if (!company) throw { statusCode: 403, message: 'Acesso negado.' }

    return prisma.jobApplication.findMany({
      where: {
        job: { companyId: company.id },
        ...(jobId && { jobId }),
        ...(status && { status }),
      },
      orderBy: { appliedAt: 'desc' },
      include: {
        worker: {
          select: {
            id: true,
            fullName: true,
            slug: true,
            avatarUrl: true,
            primarySpecialty: true,
            yearsExperience: true,
            scoreAvg: true,
            reviewCount: true,
            locationCity: true,
            locationCountry: true,
            certifications: {
              where: { expiryDate: { gte: new Date() } },
              select: { standard: true, processCode: true, isVerified: true },
              take: 3,
            },
          },
        },
        job: { select: { title: true, id: true, slug: true, hourlyRateMin: true, hourlyRateMax: true, workLocationCity: true } },
      },
    })
  }

  async getMine(userId: string) {
    const worker = await prisma.workerProfile.findUnique({ where: { userId } })
    if (!worker) throw { statusCode: 403, message: 'Acesso negado.' }

    return prisma.jobApplication.findMany({
      where: { workerId: worker.id },
      orderBy: { appliedAt: 'desc' },
      include: {
        job: {
          select: {
            title: true,
            slug: true,
            hourlyRateMin: true,
            hourlyRateMax: true,
            workLocationCity: true,
            housingIncluded: true,
            estimatedDurationWeeks: true,
            status: true,
            company: { select: { companyName: true, slug: true, logoUrl: true, scoreAvg: true } },
          },
        },
      },
    })
  }
}
