import { Db } from 'mongodb';

export async function createConversationIndexes(db: Db): Promise<void> {
  const conversations = db.collection('conversations');

  await conversations.createIndex(
    { tenant_id: 1, 'participants.user_id': 1, updated_at: -1 },
    { name: 'idx_tenant_user_updated_at' }
  );

  await conversations.createIndex(
    { tenant_id: 1, type: 1, 'participants.user_id': 1 },
    { name: 'idx_tenant_type_user' }
  );

  await conversations.createIndex(
    { _id: 1, tenant_id: 1 },
    { name: 'idx_id_tenant' }
  );

  console.log('Conversation indexes created.');
}
