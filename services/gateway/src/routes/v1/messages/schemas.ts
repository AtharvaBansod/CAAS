// Zod schemas for message validation
import { z } from 'zod';

export const sendMessageSchema = z.object({
  conversation_id: z.string(),
  type: z.enum(['text', 'media', 'system', 'rich']),
  content: z.object({
    text: z.string().max(4000).optional(),
    media: z.array(z.object({
      id: z.string(),
      type: z.enum(['image', 'video', 'audio', 'file']),
      url: z.string(),
      thumbnail_url: z.string().optional(),
      filename: z.string(),
      size: z.number(),
      mime_type: z.string(),
      dimensions: z.object({
        width: z.number(),
        height: z.number(),
      }).optional(),
      duration: z.number().optional(),
    })).optional(),
    system: z.object({
      type: z.string(),
      data: z.record(z.any()),
    }).optional(),
    rich: z.object({
      type: z.enum(['card', 'carousel', 'location', 'contact', 'poll']),
      data: z.any(),
    }).optional(),
  }),
  reply_to: z.string().optional(),
  forwarded_from: z.string().optional(),
});

export const messageQuerySchema = z.object({
  before: z.string().optional(),
  after: z.string().optional(),
  limit: z.number().min(1).max(100).default(50).optional(),
  include_deleted: z.boolean().default(false).optional(),
});

export const editMessageSchema = z.object({
  content: z.string().max(4000),
});

export const forwardMessageSchema = z.object({
  conversation_ids: z.array(z.string()).min(1).max(5),
});
