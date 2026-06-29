import fp from 'fastify-plugin'
import type { FastifyInstance } from 'fastify'
import { ZodError } from 'zod'

export const errorHandlerPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.setErrorHandler((error, _request, reply) => {
    fastify.log.error(error)

    if (error instanceof ZodError) {
      const details: Record<string, string[]> = {}
      for (const issue of error.issues) {
        const key = issue.path.join('.') || 'root'
        if (!details[key]) details[key] = []
        details[key].push(issue.message)
      }
      return reply.code(422).send({
        code: 'VALIDATION_ERROR',
        message: 'Dados inválidos.',
        details,
      })
    }

    if (error.statusCode) {
      return reply.code(error.statusCode).send({
        code: error.code ?? 'ERROR',
        message: error.message,
      })
    }

    return reply.code(500).send({
      code: 'INTERNAL_ERROR',
      message: 'Erro interno do servidor.',
    })
  })
})
