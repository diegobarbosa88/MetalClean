import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import {
  LoginSchema,
  RefreshTokenSchema,
  RegisterCompanySchema,
  RegisterWorkerSchema,
} from '@metalclean/validators/auth'

import { AuthService } from './auth.service.js'

export async function authRoutes(fastify: FastifyInstance) {
  const authService = new AuthService(fastify)

  fastify.post('/auth/register/worker', {
    schema: {
      tags: ['Auth'],
      summary: 'Registo de trabalhador',
      body: RegisterWorkerSchema,
    },
    handler: async (request, reply) => {
      const result = await authService.registerWorker(request.body)
      return reply.code(201).send(result)
    },
  })

  fastify.post('/auth/register/company', {
    schema: {
      tags: ['Auth'],
      summary: 'Registo de empresa',
      body: RegisterCompanySchema,
    },
    handler: async (request, reply) => {
      const result = await authService.registerCompany(request.body)
      return reply.code(201).send(result)
    },
  })

  fastify.post('/auth/login', {
    schema: {
      tags: ['Auth'],
      summary: 'Login',
      body: LoginSchema,
    },
    handler: async (request, reply) => {
      const result = await authService.login(request.body)
      return reply.send(result)
    },
  })

  fastify.post('/auth/refresh', {
    schema: {
      tags: ['Auth'],
      summary: 'Renovar access token',
      body: RefreshTokenSchema,
    },
    handler: async (request, reply) => {
      const tokens = await authService.refreshTokens(request.body)
      return reply.send(tokens)
    },
  })

  fastify.get('/auth/me', {
    schema: {
      tags: ['Auth'],
      summary: 'Obter utilizador autenticado',
      security: [{ bearerAuth: [] }],
    },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const user = await authService.getMe(request.user.sub)
      return reply.send(user)
    },
  })

  fastify.post('/auth/logout', {
    schema: {
      tags: ['Auth'],
      summary: 'Logout',
      body: z.object({ refreshToken: z.string() }),
    },
    handler: async (_request, reply) => {
      // In a full implementation, add token to a Redis blacklist
      return reply.send({ success: true })
    },
  })
}
