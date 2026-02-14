/**
 * Bulk Operations
 * 
 * Helper functions for common bulk operations
 */

import { Collection, BulkWriteResult } from 'mongodb';

/**
 * Bulk insert messages
 */
export async function bulkInsertMessages(
  collection: Collection,
  messages: any[]
): Promise<BulkWriteResult> {
  if (messages.length === 0) {
    throw new Error('No messages to insert');
  }

  const operations = messages.map((message) => ({
    insertOne: {
      document: {
        ...message,
        created_at: message.created_at || new Date(),
      },
    },
  }));

  return collection.bulkWrite(operations, { ordered: false });
}

/**
 * Bulk update conversations
 */
export async function bulkUpdateConversations(
  collection: Collection,
  updates: Array<{
    conversationId: string;
    tenantId: string;
    lastMessageAt: Date;
  }>
): Promise<BulkWriteResult> {
  if (updates.length === 0) {
    throw new Error('No updates to perform');
  }

  const operations = updates.map((update) => ({
    updateOne: {
      filter: {
        conversation_id: update.conversationId,
        tenant_id: update.tenantId,
      },
      update: {
        $set: {
          last_message_at: update.lastMessageAt,
          updated_at: new Date(),
        },
        $inc: {
          message_count: 1,
        },
      },
    },
  }));

  return collection.bulkWrite(operations, { ordered: false });
}

/**
 * Bulk soft-delete messages
 */
export async function bulkDeleteMessages(
  collection: Collection,
  messageIds: string[],
  tenantId: string
): Promise<BulkWriteResult> {
  if (messageIds.length === 0) {
    throw new Error('No messages to delete');
  }

  const operations = messageIds.map((messageId) => ({
    updateOne: {
      filter: {
        message_id: messageId,
        tenant_id: tenantId,
      },
      update: {
        $set: {
          deleted_at: new Date(),
          updated_at: new Date(),
        },
      },
    },
  }));

  return collection.bulkWrite(operations, { ordered: false });
}

/**
 * Bulk upsert documents
 */
export async function bulkUpsert(
  collection: Collection,
  documents: Array<{ filter: any; update: any }>
): Promise<BulkWriteResult> {
  if (documents.length === 0) {
    throw new Error('No documents to upsert');
  }

  const operations = documents.map((doc) => ({
    updateOne: {
      filter: doc.filter,
      update: doc.update,
      upsert: true,
    },
  }));

  return collection.bulkWrite(operations, { ordered: false });
}

/**
 * Bulk increment counters
 */
export async function bulkIncrementCounters(
  collection: Collection,
  increments: Array<{
    filter: any;
    field: string;
    amount: number;
  }>
): Promise<BulkWriteResult> {
  if (increments.length === 0) {
    throw new Error('No increments to perform');
  }

  const operations = increments.map((inc) => ({
    updateOne: {
      filter: inc.filter,
      update: {
        $inc: {
          [inc.field]: inc.amount,
        },
      },
    },
  }));

  return collection.bulkWrite(operations, { ordered: false });
}
