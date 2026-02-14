import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import { MongoClient } from 'mongodb';
import { BulkIndexer, IndexMetrics } from './bulk-indexer.js';

export class Reindexer {
  private esClient: ElasticsearchClient;
  private mongoClient: MongoClient;
  private bulkIndexer: BulkIndexer;

  constructor(esClient: ElasticsearchClient, mongoClient: MongoClient) {
    this.esClient = esClient;
    this.mongoClient = mongoClient;
    this.bulkIndexer = new BulkIndexer(esClient, 500, 5000);
  }

  async reindexMessages(tenantId?: string): Promise<void> {
    console.log(`Starting message reindex${tenantId ? ` for tenant ${tenantId}` : ''}`);

    const db = this.mongoClient.db();
    const collections = await db.listCollections().toArray();

    const messageCollections = collections
      .filter((col) => col.name.match(/^tenant_.*_messages$/))
      .filter((col) => !tenantId || col.name === `tenant_${tenantId}_messages`);

    for (const collection of messageCollections) {
      console.log(`Reindexing collection: ${collection.name}`);

      const cursor = db.collection(collection.name).find({
        deleted_at: null,
      });

      let count = 0;
      for await (const message of cursor) {
        await this.bulkIndexer.addOperation({
          index: 'messages',
          id: message._id.toString(),
          document: {
            tenant_id: message.tenant_id || tenantId,
            conversation_id: message.conversation_id?.toString(),
            sender_id: message.sender_id,
            content: message.content,
            type: message.type,
            created_at: message.created_at?.toISOString(),
            updated_at: message.updated_at?.toISOString(),
            indexed_at: new Date().toISOString(),
          },
        });

        count++;
        if (count % 1000 === 0) {
          console.log(`Indexed ${count} messages from ${collection.name}`);
        }
      }

      await this.bulkIndexer.flush();
      console.log(`Completed ${collection.name}: ${count} messages`);
    }

    console.log('Message reindex completed');
  }

  async reindexConversations(tenantId?: string): Promise<void> {
    console.log(`Starting conversation reindex${tenantId ? ` for tenant ${tenantId}` : ''}`);

    const db = this.mongoClient.db();
    const collections = await db.listCollections().toArray();

    const conversationCollections = collections
      .filter((col) => col.name.match(/^tenant_.*_conversations$/))
      .filter((col) => !tenantId || col.name === `tenant_${tenantId}_conversations`);

    for (const collection of conversationCollections) {
      console.log(`Reindexing collection: ${collection.name}`);

      const cursor = db.collection(collection.name).find({
        archived_at: null,
      });

      let count = 0;
      for await (const conversation of cursor) {
        await this.bulkIndexer.addOperation({
          index: 'conversations',
          id: conversation._id.toString(),
          document: {
            tenant_id: conversation.tenant_id || tenantId,
            name: conversation.name,
            type: conversation.type,
            member_ids: conversation.members?.map((m: any) => m.user_id) || [],
            metadata: conversation.metadata,
            created_at: conversation.created_at?.toISOString(),
            updated_at: conversation.updated_at?.toISOString(),
            indexed_at: new Date().toISOString(),
          },
        });

        count++;
        if (count % 1000 === 0) {
          console.log(`Indexed ${count} conversations from ${collection.name}`);
        }
      }

      await this.bulkIndexer.flush();
      console.log(`Completed ${collection.name}: ${count} conversations`);
    }

    console.log('Conversation reindex completed');
  }

  async reindexUsers(tenantId?: string): Promise<void> {
    console.log(`Starting user reindex${tenantId ? ` for tenant ${tenantId}` : ''}`);

    const db = this.mongoClient.db();
    const usersCollection = db.collection('users');

    const query: any = {};
    if (tenantId) {
      query.tenant_id = tenantId;
    }

    const cursor = usersCollection.find(query);

    let count = 0;
    for await (const user of cursor) {
      await this.bulkIndexer.addOperation({
        index: 'users',
        id: user._id.toString(),
        document: {
          tenant_id: user.tenant_id,
          username: user.username,
          display_name: user.display_name,
          email: user.email,
          created_at: user.created_at?.toISOString(),
          updated_at: user.updated_at?.toISOString(),
          indexed_at: new Date().toISOString(),
        },
      });

      count++;
      if (count % 1000 === 0) {
        console.log(`Indexed ${count} users`);
      }
    }

    await this.bulkIndexer.flush();
    console.log(`User reindex completed: ${count} users`);
  }

  async reindexAll(tenantId?: string): Promise<void> {
    console.log('Starting full reindex');

    await this.reindexMessages(tenantId);
    await this.reindexConversations(tenantId);
    await this.reindexUsers(tenantId);

    console.log('Full reindex completed');
  }

  getMetrics(): IndexMetrics {
    return this.bulkIndexer.getMetrics();
  }
}
