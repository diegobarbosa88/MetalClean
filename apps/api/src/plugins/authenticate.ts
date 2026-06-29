import fp from 'fastify-plugin'
import type { FastifyInstance, FastifyRequest } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: { code: (s: number) => { send: (b: unknown) => void } }) => Promise<void>
    config: typeof import('../config.js').config
  }
  interface FastifyRequest {
    user: { sub: string; accountType: string; type: string }
  }
}

export const authenticatePlugin = fp(async (fastify: FastifyInstance) => {
  fastify.decorate('authenticate', async (request: FastifyRequest) => {
    try {
      await request.jwtVerify()
    } catch {
      throw fastify.httpErrors.unauthorized('Token inválido ou expirado.')
    }
  })
})
