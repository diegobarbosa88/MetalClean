import { prisma } from '../../lib/prisma.js'
import { createUniqueSlug } from '../../lib/slugify.js'
import { meili, JOBS_INDEX, jobToDocument } from '../../lib/meilisearch.js'
import type { CreateJobInput, UpdateJobStatusInput, JobSearchInput } from '@metalclean/validators/job'

export class JobsService {
  async create(userId: string, input: CreateJobInput) {
    const company = await prisma.companyProfile.findUnique({ where: { userId } })
    if (!company) throw { statusCode: 403, message: 'Apenas empresas podem publicar vagas.' }

    return prisma.jobPosting.create({
      data: {
        companyId: company.id,
        slug: createUniqueSlug(input.title),
        title: input.title,
        description: input.description,
        specialtyRequired: input.specialtyRequired,
        specialtiesAccepted: input.specialtiesAccepted ?? [],
        requiredCertifications: input.requiredCertifications ?? [],
        minYearsExperience: input.minYearsExperience ?? undefined,
        ownToolsRequired: input.ownToolsRequired,
        hourlyRateMin: input.hourlyRateMin,
        hourlyRateMax: input.hourlyRateMax ?? undefined,
        currency: input.currency,
        rateIncludesTax: input.rateIncludesTax,
        subsidenceDaily: input.subsidenceDaily ?? undefined,
        housingIncluded: input.housingIncluded,
        housingQuality: input.housingQuality ?? undefined,
        transportIncluded: input.transportIncluded,
        projectName: input.projectName ?? undefined,
        workLocationCity: input.workLocationCity,
        workLocationCountry: input.workLocationCountry,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        estimatedDurationWeeks: input.estimatedDurationWeeks ?? undefined,
        shiftPattern: input.shiftPattern ?? undefined,
        materialTypes: input.materialTypes ?? [],
        status: 'draft',
      },
      include: { company: { select: { companyName: true, slug: true, logoUrl: true } } },
    })

    // Sync Meilisearch (apenas quando publicado)
    if (input.status === undefined || input.status === 'published') {
      // Já em estado draft — não indexar ainda
    }

    return job
  }

  async updateStatus(userId: string, jobId: string, input: UpdateJobStatusInput) {
    const company = await prisma.companyProfile.findUnique({ where: { userId } })
    if (!company) throw { statusCode: 403, message: 'Acesso negado.' }

    const job = await prisma.jobPosting.findFirst({ where: { id: jobId, companyId: company.id } })
    if (!job) throw { statusCode: 404, message: 'Vaga não encontrada.' }

    const updated = await prisma.jobPosting.update({
      where: { id: jobId },
      data: {
        status: input.status,
        ...(input.status === 'published' && !job.publishedAt && { publishedAt: new Date() }),
      },
      include: { company: { select: { companyName: true, slug: true, logoUrl: true, scoreAvg: true } } },
    })

    if (input.status === 'published') {
      meili.index(JOBS_INDEX).addDocuments([jobToDocument(updated as Record<string, unknown>)]).catch(() => {})
    } else {
      meili.index(JOBS_INDEX).deleteDocument(jobId).catch(() => {})
    }

    return updated
  }

  async getById(jobId: string, requestingUserId?: string) {
    const job = await prisma.jobPosting.findFirst({
      where: { id: jobId, deletedAt: null },
      include: {
        company: {
          select: {
            id: true,
            userId: true,
            companyName: true,
            slug: true,
            logoUrl: true,
            locationCity: true,
            locationCountry: true,
            scoreAvg: true,
            reviewCount: true,
            companyType: true,
          },
        },
      },
    })

    if (!job) throw { statusCode: 404, message: 'Vaga não encontrada.' }

    // Increment view count (fire-and-forget)
    prisma.jobPosting.update({ where: { id: jobId }, data: { viewCount: { increment: 1 } } }).catch(() => {})

    // If requester is a worker, check if they already applied
    let hasApplied = false
    if (requestingUserId) {
      const workerProfile = await prisma.workerProfile.findUnique({ where: { userId: requestingUserId } })
      if (workerProfile) {
        const application = await prisma.jobApplication.findFirst({
          where: { jobId, workerId: workerProfile.id },
        })
        hasApplied = !!application
      }
    }

    return { ...job, hasApplied }
  }

  async getBySlug(slug: string) {
    const job = await prisma.jobPosting.findFirst({
      where: { slug, deletedAt: null },
      include: {
        company: {
          select: {
            companyName: true,
            slug: true,
            logoUrl: true,
            scoreAvg: true,
            reviewCount: true,
            locationCity: true,
          },
        },
      },
    })
    if (!job) throw { statusCode: 404, message: 'Vaga não encontrada.' }
    return job
  }

  async search(input: JobSearchInput) {
    const { specialty, country, city, minRate, housingIncluded, materialType, shiftPattern, q, page, pageSize } = input
    const skip = (page - 1) * pageSize

    const where: Parameters<typeof prisma.jobPosting.findMany>[0]['where'] = {
      status: 'published',
      deletedAt: null,
      ...(specialty && { specialtyRequired: specialty }),
      ...(country && { workLocationCountry: country }),
      ...(city && { workLocationCity: { contains: city, mode: 'insensitive' } }),
      ...(minRate && { hourlyRateMin: { gte: minRate } }),
      ...(housingIncluded !== undefined && { housingIncluded }),
      ...(shiftPattern && { shiftPattern }),
      ...(materialType && { materialTypes: { has: materialType as never } }),
      ...(q && {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { projectName: { contains: q, mode: 'insensitive' } },
        ],
      }),
    }

    const [data, total] = await Promise.all([
      prisma.jobPosting.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { publishedAt: 'desc' },
        include: {
          company: {
            select: {
              companyName: true,
              slug: true,
              logoUrl: true,
              scoreAvg: true,
              locationCity: true,
            },
          },
        },
      }),
      prisma.jobPosting.count({ where }),
    ])

    return { data, total, page, pageSize, hasMore: skip + data.length < total }
  }

  async getMyJobs(userId: string) {
    const company = await prisma.companyProfile.findUnique({ where: { userId } })
    if (!company) throw { statusCode: 403, message: 'Apenas empresas têm vagas.' }

    return prisma.jobPosting.findMany({
      where: { companyId: company.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { applications: true } },
      },
    })
  }

  async softDelete(userId: string, jobId: string) {
    const company = await prisma.companyProfile.findUnique({ where: { userId } })
    if (!company) throw { statusCode: 403, message: 'Acesso negado.' }

    const job = await prisma.jobPosting.findFirst({ where: { id: jobId, companyId: company.id } })
    if (!job) throw { statusCode: 404, message: 'Vaga não encontrada.' }

    return prisma.jobPosting.update({
      where: { id: jobId },
      data: { deletedAt: new Date(), status: 'cancelled' },
    })
  }
}
