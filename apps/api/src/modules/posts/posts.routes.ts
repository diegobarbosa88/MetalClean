import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { CreatePostSchema, CreateCommentSchema, ReportContentSchema } from '@metalclean/validators/post'
import { PostsService, FeedQuerySchema } from './posts.service.js'

export async function postsRoutes(fastify: FastifyInstance) {
  const svc = new PostsService()

  // Public: global feed
  fastify.get('/feed', {
    schema: { tags: ['Posts'], summary: 'Feed de posts', querystring: FeedQuerySchema },
    handler: async (request) => {
      const userId = (request.user as { sub?: string } | undefined)?.sub
      return svc.getFeed(userId, request.query)
    },
  })

  // Auth: create post
  fastify.post('/posts', {
    schema: { tags: ['Posts'], summary: 'Criar post', security: [{ bearerAuth: [] }], body: CreatePostSchema },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const post = await svc.create(request.user.sub, request.body)
      return reply.code(201).send(post)
    },
  })

  // Auth: like/unlike post (toggle)
  fastify.post('/posts/:id/like', {
    schema: {
      tags: ['Posts'],
      summary: 'Gosto (toggle)',
      security: [{ bearerAuth: [] }],
      params: z.object({ id: z.string().uuid() }),
    },
    onRequest: [fastify.authenticate],
    handler: async (request) => {
      const { id } = request.params as { id: string }
      return svc.like(request.user.sub, id)
    },
  })

  // Public: get comments for a post
  fastify.get('/posts/:id/comments', {
    schema: { tags: ['Posts'], summary: 'Comentários do post', params: z.object({ id: z.string().uuid() }) },
    handler: async (request) => {
      const { id } = request.params as { id: string }
      return svc.getComments(id)
    },
  })

  // Auth: add comment to post
  fastify.post('/posts/:id/comments', {
    schema: {
      tags: ['Posts'],
      summary: 'Comentar post',
      security: [{ bearerAuth: [] }],
      params: z.object({ id: z.string().uuid() }),
      body: CreateCommentSchema,
    },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }
      const comment = await svc.addComment(request.user.sub, id, request.body)
      return reply.code(201).send(comment)
    },
  })

  // Auth: delete own post
  fastify.delete('/posts/:id', {
    schema: {
      tags: ['Posts'],
      summary: 'Apagar post',
      security: [{ bearerAuth: [] }],
      params: z.object({ id: z.string().uuid() }),
    },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const { id } = request.params as { id: string }
      await svc.deletePost(request.user.sub, id)
      return reply.code(204).send()
    },
  })

  // Auth: report content
  fastify.post('/moderation/reports', {
    schema: {
      tags: ['Moderation'],
      summary: 'Denunciar conteúdo',
      security: [{ bearerAuth: [] }],
      body: ReportContentSchema,
    },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const report = await svc.report(request.user.sub, request.body)
      return reply.code(201).send(report)
    },
  })
}
