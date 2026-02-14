import { z } from 'zod';

export const CreateConversationSchema = z.object({
  type: z.enum(['direct', 'group', 'channel']),
  participant_ids: z.array(z.string().min(1)).min(1),
  name: z.string().min(1).max(100).optional(),
  avatar_url: z.string().url().optional(),
  initial_message_content: z.string().min(1).optional(),
});

export const UpdateConversationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatar_url: z.string().url().optional(),
  is_muted: z.boolean().optional(),
});

export const ConversationIdSchema = z.string().min(1);

export const ParticipantIdSchema = z.string().min(1);

export const ListConversationsSchema = z.object({
  limit: z.preprocess(
    (val) => parseInt(z.string().parse(val), 10),
    z.number().int().positive().max(100).default(20)
  ).optional(),
  offset: z.preprocess(
    (val) => parseInt(z.string().parse(val), 10),
    z.number().int().min(0).default(0)
  ).optional(),
  before: z.preprocess((val) => new Date(z.string().parse(val)), z.date()).optional(),
  after: z.preprocess((val) => new Date(z.string().parse(val)), z.date()).optional(),
});

// Function to sanitize input (example)
export function sanitizeInput<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}
