import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { UpdateCompanyProfileSchema, CompanySearchSchema } from '@metalclean/validators/company'
import { CompaniesService } from './companies.service.js'

export async function companiesRoutes(fastify: FastifyInstance) {
  const svc = new CompaniesService()

  fastify.get('/companies', {
    schema: { tags: ['Companies'], summary: 'Pesquisar empresas', querystring: CompanySearchSchema },
    handler: async (request) => svc.search(request.query),
  })

  fastify.get('/companies/:slug', {
    schema: { tags: ['Companies'], summary: 'Perfil público da empresa', params: z.object({ slug: z.string() }) },
    handler: async (request) => {
      const { slug } = request.params as { slug: string }
      const userId = (request.user as { sub?: string } | undefined)?.sub
      return svc.getProfile(slug, userId)
    },
  })

  fastify.put('/companies/me', {
    schema: { tags: ['Companies'], summary: 'Atualizar perfil da empresa', security: [{ bearerAuth: [] }], body: UpdateCompanyProfileSchema },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      if (request.user.accountType !== 'company') {
        return reply.code(403).send({ message: 'Apenas empresas podem editar perfil de empresa.' })
      }
      const result = await svc.updateProfile(request.user.sub, request.body)
      return reply.send(result)
    },
  })
}
