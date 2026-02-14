import { z } from 'zod';

export const createConversationSchema = z.object({
  type: z.enum(['direct', 'group', 'channel']),
  participant_ids: z.array(z.string()).min(1),
  name: z.string().min(1).max(100).nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  initial_message_content: z.string().min(1).nullable().optional(),
});

export const conversationIdSchema = z.object({
  id: z.string().min(1),
});

export const addMembersBodySchema = z.object({
  member_ids: z.array(z.string()).min(1),
});

export const updateMemberRoleBodySchema = z.object({
  role: z.enum(['admin', 'member']),
});

export const listConversationsSchema = z.object({
  limit: z.string().regex(/^\d+$/).default('20').transform(Number),
  offset: z.string().regex(/^\d+$/).default('0').transform(Number),
  before: z.string().datetime().nullable().optional(),
  after: z.string().datetime().nullable().optional(),
});

export const getConversationSchema = z.object({
  id: z.string().min(1),
});

export const updateConversationSchema = z.object({
  name: z.string().min(1).max(100).nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  is_muted: z.boolean().nullable().optional(),
});

export const deleteConversationSchema = z.object({
  id: z.string().min(1),
});

// Response schemas (simplified for brevity, can be more detailed)
export const conversationResponseSchema = z.object({
  _id: z.string(),
  type: z.enum(['direct', 'group', 'channel']),
  tenant_id: z.string(),
  participants: z.array(z.object({
    user_id: z.string(),
    role: z.enum(['admin', 'member']),
    joined_at: z.string().datetime(),
    notifications: z.enum(['all', 'mentions', 'none']),
  })),
  name: z.string().nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  settings: z.object({
    is_muted: z.boolean(),
  }),
  last_message: z.object({
    message_id: z.string(),
    sender_id: z.string(),
    content: z.string(),
    sent_at: z.string().datetime(),
  }).nullable().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const paginatedConversationsResponseSchema = z.object({
  data: z.array(conversationResponseSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export const createInviteLinkBodySchema = z.object({
  expires_at: z.string().datetime().nullable().optional(),
  max_uses: z.number().min(1).nullable().optional(),
  single_use: z.boolean().nullable().optional(),
  require_approval: z.boolean().nullable().optional(),
});

export const joinViaInviteCodeParamsSchema = z.object({
  code: z.string().min(1),
});

export const userIdSchema = z.object({
  userId: z.string().min(1),
});

export const messageIdSchema = z.object({
  messageId: z.string().min(1),
});

export const muteUserBodySchema = z.object({
  user_id: z.string().min(1),
  duration: z.number().min(1).nullable().optional(),
});

export const banUserBodySchema = z.object({
  user_id: z.string().min(1),
  reason: z.string().min(1).nullable().optional(),
});
