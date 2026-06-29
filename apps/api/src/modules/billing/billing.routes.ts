import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { BillingService } from './billing.service.js'

export async function billingRoutes(fastify: FastifyInstance) {
  const svc = new BillingService()

  fastify.get('/billing/status', {
    schema: { tags: ['Billing'], summary: 'Estado da subscrição', security: [{ bearerAuth: [] }] },
    onRequest: [fastify.authenticate],
    handler: async (request) => svc.getStatus(request.user.sub),
  })

  fastify.post('/billing/checkout', {
    schema: {
      tags: ['Billing'],
      summary: 'Criar sessão de checkout Stripe',
      security: [{ bearerAuth: [] }],
      body: z.object({ returnUrl: z.string().url() }),
    },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      if (request.user.accountType !== 'company') {
        return reply.code(403).send({ message: 'Apenas empresas podem subscrever.' })
      }
      const { returnUrl } = request.body as { returnUrl: string }
      return svc.createCheckoutSession(request.user.sub, returnUrl)
    },
  })

  fastify.post('/billing/portal', {
    schema: {
      tags: ['Billing'],
      summary: 'Portal de gestão de subscrição',
      security: [{ bearerAuth: [] }],
      body: z.object({ returnUrl: z.string().url() }),
    },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      if (request.user.accountType !== 'company') {
        return reply.code(403).send({ message: 'Apenas empresas têm subscrição.' })
      }
      const { returnUrl } = request.body as { returnUrl: string }
      return svc.createPortalSession(request.user.sub, returnUrl)
    },
  })

  // Webhook Stripe — sem autenticação JWT, usa assinatura Stripe
  fastify.post('/billing/webhook', {
    config: { rawBody: true },
    schema: { tags: ['Billing'], summary: 'Webhook Stripe' },
    handler: async (request, reply) => {
      const sig = request.headers['stripe-signature'] as string
      if (!sig) return reply.code(400).send({ message: 'Sem assinatura.' })
      const rawBody = (request as unknown as { rawBody: Buffer }).rawBody
      return svc.handleWebhook(rawBody, sig)
    },
  })
}
