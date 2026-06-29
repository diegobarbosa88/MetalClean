import { prisma } from '../../lib/prisma.js'
import { createUniqueSlug } from '../../lib/slugify.js'
import { meili, WORKERS_INDEX, workerToDocument } from '../../lib/meilisearch.js'
import type { UpdateWorkerProfileInput, AddCertificationInput, WorkerSearchInput } from '@metalclean/validators/worker'

export class WorkersService {
  async getProfile(slug: string, requestingUserId?: string) {
    const profile = await prisma.workerProfile.findUnique({
      where: { slug },
      include: {
        certifications: { orderBy: { issueDate: 'desc' } },
        user: { select: { id: true, email: true, createdAt: true } },
        matches: {
          where: { status: { in: ['completed', 'active'] } },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            confirmedHourlyRate: true,
            workLocationCity: true,
            workLocationCountry: true,
            startDate: true,
            actualEndDate: true,
            status: true,
            company: { select: { companyName: true, slug: true, logoUrl: true } },
          },
        },
      },
    })

    if (!profile) throw { statusCode: 404, message: 'Perfil não encontrado.' }

    // Fetch published reviews for this worker
    const reviews = await prisma.review.findMany({
      where: {
        revieweeUserId: profile.userId,
        status: 'published',
        isVisible: true,
      },
      orderBy: { submittedAt: 'desc' },
      take: 20,
      include: {
        match: {
          select: {
            workLocationCity: true,
            startDate: true,
            actualEndDate: true,
            company: { select: { companyName: true, slug: true } },
          },
        },
      },
    })

    const isOwner = requestingUserId === profile.userId

    return { ...profile, reviews, isOwner }
  }

  async updateProfile(userId: string, input: UpdateWorkerProfileInput) {
    const profile = await prisma.workerProfile.findUnique({ where: { userId } })
    if (!profile) throw { statusCode: 404, message: 'Perfil não encontrado.' }

    const updated = await prisma.workerProfile.update({
      where: { userId },
      data: {
        ...input,
        availableFrom: input.availableFrom ? new Date(input.availableFrom) : undefined,
        desiredHourlyRateMin: input.desiredHourlyRateMin ?? undefined,
        desiredHourlyRateMax: input.desiredHourlyRateMax ?? undefined,
      },
      include: { certifications: { select: { standard: true } } },
    })

    meili.index(WORKERS_INDEX).addDocuments([workerToDocument(updated as Record<string, unknown>)]).catch(() => {})

    return updated
  }

  async addCertification(userId: string, input: AddCertificationInput) {
    const profile = await prisma.workerProfile.findUnique({ where: { userId } })
    if (!profile) throw { statusCode: 404, message: 'Perfil não encontrado.' }

    return prisma.workerCertification.create({
      data: {
        workerId: profile.id,
        ...input,
        issueDate: new Date(input.issueDate),
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : undefined,
      },
    })
  }

  async removeCertification(userId: string, certId: string) {
    const profile = await prisma.workerProfile.findUnique({ where: { userId } })
    if (!profile) throw { statusCode: 404, message: 'Perfil não encontrado.' }

    const cert = await prisma.workerCertification.findFirst({
      where: { id: certId, workerId: profile.id },
    })
    if (!cert) throw { statusCode: 404, message: 'Certificação não encontrada.' }

    await prisma.workerCertification.delete({ where: { id: certId } })
    return { success: true }
  }

  async search(input: WorkerSearchInput) {
    const { specialty, country, city, availability, minScore, hasOwnTools, certification, q, page, pageSize } = input
    const skip = (page - 1) * pageSize

    const where: Parameters<typeof prisma.workerProfile.findMany>[0]['where'] = {
      ...(specialty && { primarySpecialty: specialty }),
      ...(country && { locationCountry: country }),
      ...(city && { locationCity: { contains: city, mode: 'insensitive' } }),
      ...(availability && { availabilityStatus: availability }),
      ...(hasOwnTools !== undefined && { hasOwnTools }),
      ...(minScore && { scoreAvg: { gte: minScore } }),
      ...(certification && {
        certifications: { some: { standard: { contains: certification, mode: 'insensitive' } } },
      }),
      ...(q && {
        OR: [
          { fullName: { contains: q, mode: 'insensitive' } },
          { headline: { contains: q, mode: 'insensitive' } },
          { bio: { contains: q, mode: 'insensitive' } },
        ],
      }),
    }

    const [data, total] = await Promise.all([
      prisma.workerProfile.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ scoreAvg: 'desc' }, { reviewCount: 'desc' }],
        include: {
          certifications: {
            where: { expiryDate: { gte: new Date() } },
            select: { standard: true, processCode: true, isVerified: true },
            take: 3,
          },
        },
      }),
      prisma.workerProfile.count({ where }),
    ])

    return { data, total, page, pageSize, hasMore: skip + data.length < total }
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    return prisma.workerProfile.update({ where: { userId }, data: { avatarUrl } })
  }
}
