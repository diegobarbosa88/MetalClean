import { prisma } from '../../lib/prisma.js'
import type { UpdateCompanyProfileInput, CompanySearchInput } from '@metalclean/validators/company'

export class CompaniesService {
  async getProfile(slug: string, requestingUserId?: string) {
    const profile = await prisma.companyProfile.findUnique({
      where: { slug },
      include: {
        user: { select: { id: true, createdAt: true } },
        jobPostings: {
          where: { status: 'published', deletedAt: null },
          orderBy: { publishedAt: 'desc' },
          take: 10,
          select: {
            id: true,
            title: true,
            slug: true,
            specialtyRequired: true,
            hourlyRateMin: true,
            hourlyRateMax: true,
            workLocationCity: true,
            workLocationCountry: true,
            housingIncluded: true,
            estimatedDurationWeeks: true,
            publishedAt: true,
            applicationCount: true,
          },
        },
      },
    })

    if (!profile) throw { statusCode: 404, message: 'Empresa não encontrada.' }

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
            worker: { select: { fullName: true, slug: true, primarySpecialty: true } },
          },
        },
      },
    })

    const isOwner = requestingUserId === profile.userId

    return { ...profile, reviews, isOwner }
  }

  async updateProfile(userId: string, input: UpdateCompanyProfileInput) {
    const profile = await prisma.companyProfile.findUnique({ where: { userId } })
    if (!profile) throw { statusCode: 404, message: 'Empresa não encontrada.' }

    return prisma.companyProfile.update({
      where: { userId },
      data: {
        ...input,
        foundedYear: input.foundedYear ?? undefined,
      },
    })
  }

  async search(input: CompanySearchInput) {
    const { type, sector, country, city, minScore, q, page, pageSize } = input
    const skip = (page - 1) * pageSize

    const where: Parameters<typeof prisma.companyProfile.findMany>[0]['where'] = {
      ...(type && { companyType: type }),
      ...(country && { locationCountry: country }),
      ...(city && { locationCity: { contains: city, mode: 'insensitive' } }),
      ...(minScore && { scoreAvg: { gte: minScore } }),
      ...(sector && { sectors: { has: sector as never } }),
      ...(q && {
        OR: [
          { companyName: { contains: q, mode: 'insensitive' } },
          { bio: { contains: q, mode: 'insensitive' } },
        ],
      }),
    }

    const [data, total] = await Promise.all([
      prisma.companyProfile.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ scoreAvg: 'desc' }, { reviewCount: 'desc' }],
        select: {
          id: true,
          companyName: true,
          slug: true,
          logoUrl: true,
          locationCity: true,
          locationCountry: true,
          companyType: true,
          sectors: true,
          employeeCountRange: true,
          reviewCount: true,
          scoreAvg: true,
        },
      }),
      prisma.companyProfile.count({ where }),
    ])

    return { data, total, page, pageSize, hasMore: skip + data.length < total }
  }

  async getByUserId(userId: string) {
    return prisma.companyProfile.findUnique({ where: { userId } })
  }
}
