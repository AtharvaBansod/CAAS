import { z } from 'zod';

// Message schemas
export const sendMessageSchema = z.object({
  conversation_id: z.string(),
  content: z.string().min(1).max(10000),
  type: z.enum(['text', 'image', 'video', 'audio', 'file']).default('text'),
  metadata: z.record(z.any()).optional(),
  reply_to: z.string().optional(),
});

export const editMessageSchema = z.object({
  content: z.string().min(1).max(10000),
});

export const addReactionSchema = z.object({
  reaction: z.string().min(1).max(50),
});

export const listMessagesQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
  before: z.string().optional(),
  after: z.string().optional(),
});

// Conversation schemas
export const createConversationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: z.enum(['direct', 'group', 'channel']),
  member_ids: z.array(z.string()).min(1),
  metadata: z.record(z.any()).optional(),
});

export const updateConversationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  metadata: z.record(z.any()).optional(),
});

export const addMemberSchema = z.object({
  user_id: z.string(),
  role: z.enum(['member', 'admin', 'owner']).default('member'),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['member', 'admin', 'owner']),
});

export const listConversationsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
  type: z.enum(['direct', 'group', 'channel']).optional(),
  archived: z.coerce.boolean().optional(),
});

// Response schemas
export const messageResponseSchema = z.object({
  id: z.string(),
  conversation_id: z.string(),
  sender_id: z.string(),
  content: z.string(),
  type: z.string(),
  metadata: z.record(z.any()).optional(),
  reply_to: z.string().optional(),
  reactions: z.array(z.object({
    reaction: z.string(),
    user_id: z.string(),
    created_at: z.string(),
  })).optional(),
  created_at: z.string(),
  updated_at: z.string().optional(),
  deleted_at: z.string().optional(),
});

export const conversationResponseSchema = z.object({
  id: z.string(),
  tenant_id: z.string(),
  name: z.string().optional(),
  type: z.string(),
  members: z.array(z.object({
    user_id: z.string(),
    role: z.string(),
    joined_at: z.string(),
  })),
  metadata: z.record(z.any()).optional(),
  unread_count: z.number().optional(),
  last_message: messageResponseSchema.optional(),
  created_at: z.string(),
  updated_at: z.string().optional(),
  archived_at: z.string().optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type EditMessageInput = z.infer<typeof editMessageSchema>;
export type AddReactionInput = z.infer<typeof addReactionSchema>;
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>;
