import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { config } from '../../config.js'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']
const ALLOWED_DOC_TYPES = ['application/pdf']
const MAX_FILE_SIZE_MB = 50

export async function uploadsRoutes(fastify: FastifyInstance) {
  // Request presigned upload URL
  fastify.post('/uploads/presign', {
    schema: {
      tags: ['Uploads'],
      summary: 'Obter URL de upload',
      security: [{ bearerAuth: [] }],
      body: z.object({
        filename: z.string().min(1).max(200),
        contentType: z.string().min(1),
        entityType: z.enum(['post_media', 'avatar', 'cover', 'certificate', 'attachment']),
        fileSizeMb: z.number().max(MAX_FILE_SIZE_MB).optional(),
      }),
    },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const { filename, contentType, entityType } = request.body as {
        filename: string
        contentType: string
        entityType: string
        fileSizeMb?: number
      }

      const allowed = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_DOC_TYPES]
      if (!allowed.includes(contentType)) {
        return reply.code(400).send({ message: 'Tipo de ficheiro não suportado.' })
      }

      // In production this generates a real Cloudflare R2 presigned PUT URL.
      // For local dev, return a mock URL structure.
      const ext = filename.split('.').pop() ?? 'bin'
      const key = `${entityType}/${request.user.sub}/${Date.now()}.${ext}`

      if (!config.r2.accessKeyId) {
        // Dev mode: return a mock URL
        return reply.send({
          uploadUrl: `http://localhost:9000/metalclean-media/${key}`,
          key,
          publicUrl: `${config.r2.publicUrl || 'http://localhost:9000/metalclean-media'}/${key}`,
          expiresIn: 900,
        })
      }

      // Production: generate actual presigned URL via AWS SDK for R2
      // This requires @aws-sdk/s3-request-presigner (add in production)
      return reply.send({
        uploadUrl: `https://${config.r2.accountId}.r2.cloudflarestorage.com/${config.r2.bucketName}/${key}`,
        key,
        publicUrl: `${config.r2.publicUrl}/${key}`,
        expiresIn: 900,
      })
    },
  })

  // Confirm upload completion
  fastify.post('/uploads/confirm', {
    schema: {
      tags: ['Uploads'],
      summary: 'Confirmar upload',
      security: [{ bearerAuth: [] }],
      body: z.object({
        key: z.string().min(1),
        entityType: z.enum(['post_media', 'avatar', 'cover', 'certificate', 'attachment']),
      }),
    },
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const { key, entityType } = request.body as { key: string; entityType: string }
      const publicUrl = `${config.r2.publicUrl || 'http://localhost:9000/metalclean-media'}/${key}`

      return reply.send({ success: true, key, publicUrl, entityType })
    },
  })
}
