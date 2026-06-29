import { prisma } from '../../lib/prisma.js'
import type { CreateMatchInput, CompleteMatchInput, CancelMatchInput } from '@metalclean/validators/match'

const REVIEW_WINDOW_DAYS = 30

export class MatchesService {
  /**
   * Company creates a match invite for a worker.
   * The worker must accept (status: pending_worker → active).
   */
  async create(userId: string, input: CreateMatchInput) {
    const company = await prisma.companyProfile.findUnique({ where: { userId } })
    if (!company) throw { statusCode: 403, message: 'Apenas empresas podem criar contratos.' }

    const worker = await prisma.workerProfile.findUnique({ where: { id: input.workerId } })
    if (!worker) throw { statusCode: 404, message: 'Trabalhador não encontrado.' }

    // Check for existing active match between same pair
    const activeMatch = await prisma.match.findFirst({
      where: { companyId: company.id, workerId: worker.id, status: 'active' },
    })
    if (activeMatch) {
      throw { statusCode: 409, message: 'Já existe um contrato ativo com este trabalhador.' }
    }

    // If applicationId provided, validate it belongs to this job/worker/company
    if (input.applicationId) {
      const app = await prisma.jobApplication.findFirst({
        where: { id: input.applicationId, workerId: worker.id },
        include: { job: { select: { companyId: true } } },
      })
      if (!app || app.job?.companyId !== company.id) {
        throw { statusCode: 400, message: 'Candidatura inválida.' }
      }
    }

    const match = await prisma.match.create({
      data: {
        companyId: company.id,
        workerId: worker.id,
        jobId: input.jobId ?? undefined,
        applicationId: input.applicationId ?? undefined,
        confirmedHourlyRate: input.confirmedHourlyRate,
        currency: input.currency,
        workLocationCity: input.workLocationCity,
        workLocationCountry: input.workLocationCountry,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        housingIncluded: input.housingIncluded,
        status: 'pending_worker',
      },
      include: {
        company: { select: { companyName: true, slug: true, logoUrl: true } },
        worker: { select: { fullName: true, slug: true, avatarUrl: true } },
      },
    })

    // Update application status if linked
    if (input.applicationId) {
      await prisma.jobApplication.update({
        where: { id: input.applicationId },
        data: { status: 'matched' },
      })
    }

    return match
  }

  /**
   * Worker accepts the match invite → status: active.
   */
  async accept(userId: string, matchId: string) {
    const worker = await prisma.workerProfile.findUnique({ where: { userId } })
    if (!worker) throw { statusCode: 403, message: 'Acesso negado.' }

    const match = await prisma.match.findFirst({
      where: { id: matchId, workerId: worker.id, status: 'pending_worker' },
    })
    if (!match) throw { statusCode: 404, message: 'Convite não encontrado ou já processado.' }

    return prisma.match.update({
      where: { id: matchId },
      data: { status: 'active', confirmedAt: new Date() },
      include: {
        company: { select: { companyName: true, slug: true } },
        worker: { select: { fullName: true, slug: true } },
      },
    })
  }

  /**
   * Either party marks the match as completed.
   * This opens the 30-day review eligibility window for both parties.
   */
  async complete(userId: string, matchId: string, input: CompleteMatchInput) {
    const match = await this.findMatchForUser(userId, matchId)
    if (!match) throw { statusCode: 404, message: 'Contrato não encontrado.' }
    if (match.status !== 'active') {
      throw { statusCode: 400, message: 'Apenas contratos ativos podem ser concluídos.' }
    }

    const now = new Date()
    const reviewDeadline = new Date(now)
    reviewDeadline.setDate(reviewDeadline.getDate() + REVIEW_WINDOW_DAYS)

    return prisma.match.update({
      where: { id: matchId },
      data: {
        status: 'completed',
        completedAt: now,
        actualEndDate: input.actualEndDate ? new Date(input.actualEndDate) : now,
        companyCanReviewUntil: reviewDeadline,
        workerCanReviewUntil: reviewDeadline,
      },
    })
  }

  /**
   * Either party can cancel a pending or active match.
   */
  async cancel(userId: string, matchId: string, input: CancelMatchInput) {
    const match = await this.findMatchForUser(userId, matchId)
    if (!match) throw { statusCode: 404, message: 'Contrato não encontrado.' }
    if (!['pending_worker', 'active'].includes(match.status)) {
      throw { statusCode: 400, message: 'Este contrato não pode ser cancelado.' }
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw { statusCode: 404, message: 'Utilizador não encontrado.' }

    return prisma.match.update({
      where: { id: matchId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledById: user.id,
        cancellationReason: input.cancellationReason ?? undefined,
      },
    })
  }

  async getById(userId: string, matchId: string) {
    const match = await this.findMatchForUser(userId, matchId)
    if (!match) throw { statusCode: 404, message: 'Contrato não encontrado.' }

    const reviews = await prisma.review.findMany({
      where: { matchId, status: 'published' },
    })

    // Check review eligibility for the requesting user
    const user = await prisma.user.findUnique({ where: { id: userId } })
    let canReview = false
    let hasReviewed = false

    if (user && match.status === 'completed') {
      const now = new Date()
      const deadline =
        user.accountType === 'company' ? match.companyCanReviewUntil : match.workerCanReviewUntil

      if (deadline && now <= deadline) {
        const existingReview = await prisma.review.findFirst({
          where: { matchId, reviewerUserId: user.id },
        })
        hasReviewed = !!existingReview
        canReview = !hasReviewed
      }
    }

    return { ...match, reviews, canReview, hasReviewed }
  }

  async getMyMatches(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw { statusCode: 404, message: 'Utilizador não encontrado.' }

    let matches

    if (user.accountType === 'worker') {
      const worker = await prisma.workerProfile.findUnique({ where: { userId } })
      if (!worker) throw { statusCode: 404, message: 'Perfil não encontrado.' }

      matches = await prisma.match.findMany({
        where: { workerId: worker.id },
        orderBy: { createdAt: 'desc' },
        include: {
          company: { select: { companyName: true, slug: true, logoUrl: true, scoreAvg: true } },
          job: { select: { title: true, slug: true } },
          reviews: { select: { reviewerUserId: true, reviewerType: true } },
        },
      })
    } else {
      const company = await prisma.companyProfile.findUnique({ where: { userId } })
      if (!company) throw { statusCode: 404, message: 'Perfil não encontrado.' }

      matches = await prisma.match.findMany({
        where: { companyId: company.id },
        orderBy: { createdAt: 'desc' },
        include: {
          worker: { select: { fullName: true, slug: true, avatarUrl: true, primarySpecialty: true, scoreAvg: true } },
          job: { select: { title: true, slug: true } },
          reviews: { select: { reviewerUserId: true, reviewerType: true } },
        },
      })
    }

    return matches.map((m) => ({
      ...m,
      hasWorkerReview: m.reviews.some((r) => r.reviewerType === 'worker'),
      hasCompanyReview: m.reviews.some((r) => r.reviewerType === 'company'),
      reviews: undefined,
    }))
  }

  private async findMatchForUser(userId: string, matchId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        workerProfile: { select: { id: true } },
        companyProfile: { select: { id: true } },
      },
    })
    if (!user) return null

    return prisma.match.findFirst({
      where: {
        id: matchId,
        OR: [
          { workerId: user.workerProfile?.id ?? '' },
          { companyId: user.companyProfile?.id ?? '' },
        ],
      },
      include: {
        company: { select: { companyName: true, slug: true, logoUrl: true, userId: true } },
        worker: { select: { fullName: true, slug: true, avatarUrl: true, primarySpecialty: true, userId: true } },
        job: { select: { title: true, slug: true } },
      },
    })
  }
}
