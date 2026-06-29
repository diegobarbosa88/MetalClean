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
import { authRoutes } from './modules/auth/auth.routes.js'

const fastify = Fastify({
  logger: {
    level: config.nodeEnv === 'production' ? 'info' : 'debug',
    transport:
      config.nodeEnv === 'development'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
})

// Decorate config onto the instance
fastify.decorate('config', config)

async function bootstrap() {
  // Security
  await fastify.register(helmet, { contentSecurityPolicy: false })
  await fastify.register(cors, {
    origin: [config.frontendUrl, /localhost:\d+/],
    credentials: true,
  })
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (req) => req.ip,
  })

  // JWT
  await fastify.register(jwt, {
    secret: config.jwt.secret,
  })

  // Swagger docs
  await fastify.register(swagger, {
    openapi: {
      info: { title: 'MetalClean API', version: '0.1.0', description: 'API da plataforma MetalClean' },
      servers: [{ url: `http://localhost:${config.port}` }],
      components: {
        securitySchemes: {
          bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
      },
    },
  })
  await fastify.register(swaggerUi, { routePrefix: '/docs' })

  // Plugins
  await fastify.register(authenticatePlugin)
  await fastify.register(errorHandlerPlugin)

  // Routes
  await fastify.register(authRoutes, { prefix: '/api/v1' })

  // Health check
  fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  // Graceful shutdown
  const shutdown = async () => {
    fastify.log.info('Shutting down...')
    await fastify.close()
    await prisma.$disconnect()
    process.exit(0)
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  try {
    await fastify.listen({ port: config.port, host: '0.0.0.0' })
    fastify.log.info(`MetalClean API running on port ${config.port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

bootstrap()
