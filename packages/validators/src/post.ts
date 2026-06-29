import { z } from 'zod'

export const CreatePostSchema = z.object({
  contentText: z.string().max(2000).optional().nullable(),
  postType: z.enum(['general', 'portfolio_work', 'job_update', 'news', 'certification']).default('general'),
  media: z
    .array(
      z.object({
        type: z.enum(['image', 'video']),
        url: z.string().url(),
        thumbnailUrl: z.string().url().optional().nullable(),
        caption: z.string().max(300).optional().nullable(),
      })
    )
    .max(10)
    .optional()
    .default([]),
  visibility: z.enum(['public', 'connections', 'private']).default('public'),
}).refine(
  (data) => data.contentText || (data.media && data.media.length > 0),
  { message: 'Post deve ter texto ou pelo menos uma imagem/vídeo' }
)

export const CreateCommentSchema = z.object({
  content: z.string().min(1).max(1000),
  parentId: z.string().uuid().optional().nullable(),
})

export const ReportContentSchema = z.object({
  targetType: z.enum(['review', 'post', 'comment', 'profile', 'message']),
  targetId: z.string().uuid(),
  reason: z.enum([
    'defamation',
    'false_information',
    'harassment',
    'spam',
    'inappropriate_content',
    'other',
  ]),
  description: z.string().max(1000).optional().nullable(),
})

export type CreatePostInput = z.infer<typeof CreatePostSchema>
export type CreateCommentInput = z.infer<typeof CreateCommentSchema>
export type ReportContentInput = z.infer<typeof ReportContentSchema>
