import { ObjectId } from 'mongodb';

export const getUserConversationsQuery = (userId: string, tenantId: string) => ({
  tenant_id: tenantId,
  'participants.user_id': userId,
});

export const getDirectConversationQuery = (userId1: string, userId2: string, tenantId: string) => ({
  tenant_id: tenantId,
  type: 'direct' as const,
  'participants.user_id': { $all: [userId1, userId2] },
  'participants': { $size: 2 },
});

export const getConversationByIdQuery = (id: ObjectId, tenantId: string) => ({
  _id: id,
  tenant_id: tenantId,
});
