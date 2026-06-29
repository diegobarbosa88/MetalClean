import 'dotenv/config'

import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import Fastify from 'fastify'

import { config } from './config.js'
import { prisma } from './lib/prisma.js'
import { authenticatePlugin } from './plugins/authenticate.js'
import { errorHandlerPlugin } from './plugins/error-handler.js'
import { createSocketServer } from './realtime/socket.js'

import { authRoutes } from './modules/auth/auth.routes.js'
import { workersRoutes } from './modules/workers/workers.routes.js'
import { companiesRoutes } from './modules/companies/companies.routes.js'
import { jobsRoutes } from './modules/jobs/jobs.routes.js'
import { applicationsRoutes } from './modules/applications/applications.routes.js'
import { matchesRoutes } from './modules/matches/matches.routes.js'
import { reviewsRoutes } from './modules/reviews/reviews.routes.js'
import { postsRoutes } from './modules/posts/posts.routes.js'
import { notificationsRoutes } from './modules/notifications/notifications.routes.js'
import { uploadsRoutes } from './modules/uploads/uploads.routes.js'
import { messagesRoutes } from './modules/messages/messages.routes.js'
import { searchRoutes } from './modules/search/search.routes.js'
import { billingRoutes } from './modules/billing/billing.routes.js'
import { analyticsRoutes } from './modules/analytics/analytics.routes.js'
import { moderationRoutes } from './modules/moderation/moderation.routes.js'
import { gdprRoutes } from './modules/gdpr/gdpr.routes.js'
import { setupMeilisearchIndexes } from './lib/meilisearch.js'

const fastify = Fastify({
  logger: {
    level: config.nodeEnv === 'production' ? 'info' : 'debug',
    transport:
      config.nodeEnv === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
})

fastify.decorate('config', config)

async function bootstrap() {
  await fastify.register(helmet, { contentSecurityPolicy: false })
  await fastify.register(cors, {
    origin: [config.frontendUrl, /localhost:\d+/],
    credentials: true,
  })
  await fastify.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
  })
  await fastify.register(jwt, { secret: config.jwt.secret })

  await fastify.register(swagger, {
    openapi: {
      info: { title: 'MetalClean API', version: '1.0.0', description: 'API da plataforma MetalClean — metalomecânica' },
      servers: [{ url: `http://localhost:${config.port}` }],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
      tags: [
        { name: 'Auth', description: 'Autenticação e sessão' },
        { name: 'Workers', description: 'Perfis de trabalhadores' },
        { name: 'Companies', description: 'Perfis de empresas' },
        { name: 'Jobs', description: 'Ofertas de trabalho' },
        { name: 'Applications', description: 'Candidaturas' },
        { name: 'Matches', description: 'Contratos confirmados' },
        { name: 'Reviews', description: 'Sistema de avaliação' },
        { name: 'Posts', description: 'Feed social' },
        { name: 'Messages', description: 'Mensagens diretas' },
        { name: 'Notifications', description: 'Notificações' },
        { name: 'Uploads', description: 'Upload de ficheiros' },
        { name: 'Moderation', description: 'Moderação de conteúdo' },
        { name: 'Search', description: 'Pesquisa unificada (Meilisearch)' },
        { name: 'Billing', description: 'Subscrições e pagamentos (Stripe)' },
        { name: 'Analytics', description: 'Analytics e estatísticas' },
        { name: 'GDPR', description: 'Portabilidade e eliminação de dados' },
      ],
    },
  })
  await fastify.register(swaggerUi, { routePrefix: '/docs' })

  await fastify.register(authenticatePlugin)
  await fastify.register(errorHandlerPlugin)

  const PREFIX = '/api/v1'
  await fastify.register(authRoutes, { prefix: PREFIX })
  await fastify.register(workersRoutes, { prefix: PREFIX })
  await fastify.register(companiesRoutes, { prefix: PREFIX })
  await fastify.register(jobsRoutes, { prefix: PREFIX })
  await fastify.register(applicationsRoutes, { prefix: PREFIX })
  await fastify.register(matchesRoutes, { prefix: PREFIX })
  await fastify.register(reviewsRoutes, { prefix: PREFIX })
  await fastify.register(postsRoutes, { prefix: PREFIX })
  await fastify.register(notificationsRoutes, { prefix: PREFIX })
  await fastify.register(uploadsRoutes, { prefix: PREFIX })
  await fastify.register(messagesRoutes, { prefix: PREFIX })
  await fastify.register(searchRoutes, { prefix: PREFIX })
  await fastify.register(billingRoutes, { prefix: PREFIX })
  await fastify.register(analyticsRoutes, { prefix: PREFIX })
  await fastify.register(moderationRoutes, { prefix: PREFIX })
  await fastify.register(gdprRoutes, { prefix: PREFIX })

  fastify.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  }))

  const shutdown = async () => {
    fastify.log.info('Shutting down...')
    await fastify.close()
    await prisma.$disconnect()
    process.exit(0)
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  try {
    await setupMeilisearchIndexes().catch((err) => fastify.log.warn(err, 'Meilisearch setup failed — continuing without search'))
    await fastify.listen({ port: config.port, host: '0.0.0.0' })

    // Fase 2: Socket.IO attached to the same HTTP server after listen
    createSocketServer(fastify.server, fastify)

    fastify.log.info(`MetalClean API running → http://localhost:${config.port}/docs`)
    fastify.log.info(`Socket.IO ready → ws://localhost:${config.port}/socket.io`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

bootstrap()
