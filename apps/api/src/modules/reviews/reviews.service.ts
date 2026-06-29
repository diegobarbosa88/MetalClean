import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import type {
  SubmitWorkerReviewInput,
  SubmitCompanyReviewInput,
  ReviewResponseInput,
  ReportReviewInput,
} from '@metalclean/validators/review'

type ReviewInput = SubmitWorkerReviewInput | SubmitCompanyReviewInput

export class ReviewsService {
  /**
   * Submit a review for a completed match.
   *
   * Rules:
   * 1. Match must be 'completed'
   * 2. Reviewer's window (company_can_review_until / worker_can_review_until) must not have expired
   * 3. Reviewer must not have already submitted a review for this match
   * 4. After submission, if both parties have now submitted, transition both to 'published'
   *    and recalculate score_avg on the reviewee's profile.
   */
  async submit(userId: string, input: ReviewInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        workerProfile: { select: { id: true } },
        companyProfile: { select: { id: true } },
      },
    })
    if (!user) throw { statusCode: 401, message: 'Utilizador não encontrado.' }

    const matchId = input.matchId
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        company: { select: { userId: true, id: true } },
        worker: { select: { userId: true, id: true } },
      },
    })
    if (!match) throw { statusCode: 404, message: 'Contrato não encontrado.' }
    if (match.status !== 'completed') {
      throw { statusCode: 400, message: 'Só é possível avaliar contratos concluídos.' }
    }

    const now = new Date()
    let reviewerType: 'company' | 'worker'
    let revieweeUserId: string
    let deadline: Date | null

    if (user.accountType === 'company' && match.company.userId === userId) {
      reviewerType = 'company'
      revieweeUserId = match.worker.userId
      deadline = match.companyCanReviewUntil
    } else if (user.accountType === 'worker' && match.worker.userId === userId) {
      reviewerType = 'worker'
      revieweeUserId = match.company.userId
      deadline = match.workerCanReviewUntil
    } else {
      throw { statusCode: 403, message: 'Não tens permissão para avaliar este contrato.' }
    }

    if (!deadline || now > deadline) {
      throw { statusCode: 400, message: 'O prazo de avaliação expirou.' }
    }

    // Check for duplicate review
    const existing = await prisma.review.findFirst({ where: { matchId, reviewerUserId: userId } })
    if (existing) throw { statusCode: 409, message: 'Já submeteste uma avaliação para este contrato.' }

    // Calculate overall score
    const overallScore = this.calculateOverallScore(input, reviewerType)

    // Determine fields based on reviewer type
    const reviewData: Prisma.ReviewCreateInput = {
      match: { connect: { id: matchId } },
      reviewerUser: { connect: { id: userId } },
      revieweeUser: { connect: { id: revieweeUserId } },
      reviewerType,
      overallScore,
      writtenReview: input.writtenReview ?? undefined,
      status: 'submitted',
    }

    if (reviewerType === 'company') {
      const w = input as SubmitWorkerReviewInput
      reviewData.scoreAttendance = w.scoreAttendance
      reviewData.scoreTechnicalQuality = w.scoreTechnicalQuality
      reviewData.scoreSafetyCompliance = w.scoreSafetyCompliance
      reviewData.scoreAttitudeTeamwork = w.scoreAttitudeTeamwork
    } else {
      const c = input as SubmitCompanyReviewInput
      reviewData.scorePaymentPunctuality = c.scorePaymentPunctuality
      reviewData.scoreRateCompliance = c.scoreRateCompliance
      reviewData.scoreSafetyConditions = c.scoreSafetyConditions
      reviewData.scoreHousingAllowances = c.scoreHousingAllowances ?? undefined
    }

    const review = await prisma.review.create({ data: reviewData })

    // Check if counterpart has already submitted — if so, publish both
    await this.tryPublishBothReviews(matchId)

    return review
  }

  /**
   * Publish both reviews if both parties have submitted.
   * Also recalculates score_avg on both affected profiles.
   */
  private async tryPublishBothReviews(matchId: string) {
    const reviews = await prisma.review.findMany({
      where: { matchId, status: 'submitted' },
    })

    // Need exactly 2 submitted reviews (one company, one worker)
    const hasCompanyReview = reviews.some((r) => r.reviewerType === 'company')
    const hasWorkerReview = reviews.some((r) => r.reviewerType === 'worker')

    if (!hasCompanyReview || !hasWorkerReview) return

    // Publish both in a transaction and recalculate scores
    await prisma.$transaction(async (tx) => {
      await tx.review.updateMany({
        where: { matchId, status: 'submitted' },
        data: { status: 'published', isVisible: true },
      })

      // Recalculate score for each reviewee
      for (const review of reviews) {
        await this.recalculateScore(tx, review.revieweeUserId)
      }
    })
  }

  /**
   * Recalculate and store score_avg on the worker or company profile.
   * Called after a review is published or moderated.
   */
  async recalculateScore(
    tx: Prisma.TransactionClient | typeof prisma,
    userId: string
  ) {
    const user = await (tx as typeof prisma).user.findUnique({
      where: { id: userId },
      select: { accountType: true },
    })
    if (!user) return

    const result = await (tx as typeof prisma).review.aggregate({
      where: { revieweeUserId: userId, status: 'published', isVisible: true },
      _avg: { overallScore: true },
      _count: { id: true },
    })

    const avg = result._avg.overallScore ?? null
    const count = result._count.id

    if (user.accountType === 'worker') {
      await (tx as typeof prisma).workerProfile.updateMany({
        where: { userId },
        data: { scoreAvg: avg, reviewCount: count },
      })
    } else if (user.accountType === 'company') {
      await (tx as typeof prisma).companyProfile.updateMany({
        where: { userId },
        data: { scoreAvg: avg, reviewCount: count },
      })
    }
  }

  async respond(userId: string, reviewId: string, input: ReviewResponseInput) {
    const review = await prisma.review.findUnique({ where: { id: reviewId } })
    if (!review) throw { statusCode: 404, message: 'Avaliação não encontrada.' }
    if (review.revieweeUserId !== userId) {
      throw { statusCode: 403, message: 'Só o avaliado pode responder.' }
    }
    if (review.status !== 'published') {
      throw { statusCode: 400, message: 'Só é possível responder a avaliações publicadas.' }
    }
    if (review.responseText) {
      throw { statusCode: 409, message: 'Já respondeste a esta avaliação.' }
    }

    return prisma.review.update({
      where: { id: reviewId },
      data: { responseText: input.responseText, responseAt: new Date() },
    })
  }

  async report(userId: string, reviewId: string, input: ReportReviewInput) {
    const review = await prisma.review.findUnique({ where: { id: reviewId } })
    if (!review) throw { statusCode: 404, message: 'Avaliação não encontrada.' }
    if (review.status !== 'published') {
      throw { statusCode: 400, message: 'Só é possível denunciar avaliações publicadas.' }
    }

    const [report] = await prisma.$transaction([
      prisma.moderationReport.create({
        data: {
          reporterUserId: userId,
          targetType: 'review',
          targetId: reviewId,
          reason: input.reason,
          description: input.description ?? undefined,
        },
      }),
      prisma.review.update({
        where: { id: reviewId },
        data: { status: 'under_review', isVisible: false },
      }),
    ])

    return report
  }

  async getForProfile(userId: string, viewerUserId?: string) {
    const reviews = await prisma.review.findMany({
      where: {
        revieweeUserId: userId,
        status: 'published',
        isVisible: true,
      },
      orderBy: { submittedAt: 'desc' },
      include: {
        match: {
          select: {
            workLocationCity: true,
            startDate: true,
            actualEndDate: true,
          },
        },
      },
    })

    // If viewer is the reviewee, also show submitted (pending blind)
    if (viewerUserId === userId) {
      const pending = await prisma.review.findMany({
        where: { revieweeUserId: userId, status: 'submitted' },
        select: { id: true, matchId: true, reviewerType: true, submittedAt: true },
      })
      return { published: reviews, pendingCount: pending.length }
    }

    return { published: reviews, pendingCount: 0 }
  }

  private calculateOverallScore(input: ReviewInput, reviewerType: 'company' | 'worker'): number {
    if (reviewerType === 'company') {
      const w = input as SubmitWorkerReviewInput
      return (w.scoreAttendance + w.scoreTechnicalQuality + w.scoreSafetyCompliance + w.scoreAttitudeTeamwork) / 4
    } else {
      const c = input as SubmitCompanyReviewInput
      const scores = [c.scorePaymentPunctuality, c.scoreRateCompliance, c.scoreSafetyConditions]
      if (c.scoreHousingAllowances != null) scores.push(c.scoreHousingAllowances)
      return scores.reduce((a, b) => a + b, 0) / scores.length
    }
  }
}
