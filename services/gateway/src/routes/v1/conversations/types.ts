import { z } from 'zod';
import {
  createConversationSchema,
  listConversationsSchema,
  getConversationSchema,
  updateConversationSchema,
  deleteConversationSchema,
} from './schemas';

// Request DTOs
export type CreateConversationRequest = z.infer<typeof createConversationSchema>;
export type ListConversationsRequest = z.infer<typeof listConversationsSchema>;
export type GetConversationRequest = z.infer<typeof getConversationSchema>;
export type UpdateConversationRequest = z.infer<typeof updateConversationSchema>;
export type DeleteConversationRequest = z.infer<typeof deleteConversationSchema>;
