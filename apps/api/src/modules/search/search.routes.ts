import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { meili, WORKERS_INDEX, JOBS_INDEX } from '../../lib/meilisearch.js'

export async function searchRoutes(fastify: FastifyInstance) {
  // Pesquisa unificada (workers + jobs)
  fastify.get('/search', {
    schema: {
      tags: ['Search'],
      summary: 'Pesquisa unificada de trabalhadores e vagas',
      querystring: z.object({
        q: z.string().optional(),
        type: z.enum(['workers', 'jobs', 'all']).default('all'),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(50).default(20),
        // Worker filters
        specialty: z.string().optional(),
        country: z.string().optional(),
        availability: z.string().optional(),
        minScore: z.coerce.number().optional(),
        // Job filters
        minRate: z.coerce.number().optional(),
        housing: z.coerce.boolean().optional(),
        featured: z.coerce.boolean().optional(),
      }),
    },
    handler: async (request) => {
      const { q, type, page, pageSize, specialty, country, availability, minScore, minRate, housing, featured } = request.query as {
        q?: string; type: string; page: number; pageSize: number
        specialty?: string; country?: string; availability?: string; minScore?: number
        minRate?: number; housing?: boolean; featured?: boolean
      }

      const offset = (page - 1) * pageSize
      const query = q ?? ''

      const results: Record<string, unknown> = {}

      if (type === 'workers' || type === 'all') {
        const filters: string[] = []
        if (specialty) filters.push(`primarySpecialty = "${specialty}"`)
        if (country) filters.push(`locationCountry = "${country}"`)
        if (availability) filters.push(`availabilityStatus = "${availability}"`)
        if (minScore != null) filters.push(`scoreAvg >= ${minScore}`)

        try {
          const res = await meili.index(WORKERS_INDEX).search(query, {
            filter: filters.length > 0 ? filters.join(' AND ') : undefined,
            limit: pageSize,
            offset,
            sort: ['scoreAvg:desc'],
          })
          results['workers'] = { hits: res.hits, total: res.estimatedTotalHits, page, pageSize }
        } catch {
          results['workers'] = { hits: [], total: 0, page, pageSize }
        }
      }

      if (type === 'jobs' || type === 'all') {
        const filters: string[] = ['status = "published"']
        if (specialty) filters.push(`specialtyRequired = "${specialty}"`)
        if (country) filters.push(`workLocationCountry = "${country}"`)
        if (minRate != null) filters.push(`hourlyRateMin >= ${minRate}`)
        if (housing != null) filters.push(`housingIncluded = ${housing}`)
        if (featured != null) filters.push(`isFeatured = ${featured}`)

        try {
          const res = await meili.index(JOBS_INDEX).search(query, {
            filter: filters.join(' AND '),
            limit: pageSize,
            offset,
            sort: ['isFeatured:desc', 'publishedAt:desc'],
          })
          results['jobs'] = { hits: res.hits, total: res.estimatedTotalHits, page, pageSize }
        } catch {
          results['jobs'] = { hits: [], total: 0, page, pageSize }
        }
      }

      return results
    },
  })

  // Sugestões de pesquisa (autocomplete)
  fastify.get('/search/suggest', {
    schema: {
      tags: ['Search'],
      summary: 'Sugestões de pesquisa',
      querystring: z.object({ q: z.string().min(2) }),
    },
    handler: async (request) => {
      const { q } = request.query as { q: string }

      const [workers, jobs] = await Promise.all([
        meili.index(WORKERS_INDEX).search(q, { limit: 4, attributesToRetrieve: ['fullName', 'slug', 'primarySpecialty'] }).catch(() => ({ hits: [] })),
        meili.index(JOBS_INDEX).search(q, { limit: 4, attributesToRetrieve: ['title', 'id', 'workLocationCity', 'companyName'] }).catch(() => ({ hits: [] })),
      ])

      return {
        workers: workers.hits,
        jobs: jobs.hits,
      }
    },
  })
}
