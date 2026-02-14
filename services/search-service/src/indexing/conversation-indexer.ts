import { Client } from '@elastic/elasticsearch';
import { MongoClient } from 'mongodb';
import { Conversation } from '../types';

export class ConversationIndexer {
  constructor(
    private esClient: Client,
    private mongoClient: MongoClient,
  ) {}

  async indexConversation(conversation: Conversation): Promise<void> {
    try {
      const participantNames = await this.getParticipantNames(
        conversation.tenant_id,
        conversation.participant_ids,
      );

      await this.esClient.index({
        index: 'conversations',
        id: conversation.id,
        document: {
          id: conversation.id,
          tenant_id: conversation.tenant_id,
          type: conversation.type,
          name: conversation.name,
          participant_ids: conversation.participant_ids,
          participant_names: participantNames,
          created_at: conversation.created_at,
          last_message_at: conversation.last_message_at,
        },
      });
      console.log(`Indexed conversation: ${conversation.id}`);
    } catch (error) {
      console.error(`Failed to index conversation ${conversation.id}:`, error);
      throw error;
    }
  }

  async updateConversation(conversation: Conversation): Promise<void> {
    try {
      const participantNames = await this.getParticipantNames(
        conversation.tenant_id,
        conversation.participant_ids,
      );

      await this.esClient.update({
        index: 'conversations',
        id: conversation.id,
        doc: {
          name: conversation.name,
          participant_ids: conversation.participant_ids,
          participant_names: participantNames,
          last_message_at: conversation.last_message_at,
        },
      });
      console.log(`Updated conversation: ${conversation.id}`);
    } catch (error) {
      console.error(`Failed to update conversation ${conversation.id}:`, error);
      throw error;
    }
  }

  async deleteConversation(conversationId: string): Promise<void> {
    try {
      await this.esClient.delete({
        index: 'conversations',
        id: conversationId,
      });
      console.log(`Deleted conversation: ${conversationId}`);
    } catch (error) {
      console.error(`Failed to delete conversation ${conversationId}:`, error);
      throw error;
    }
  }

  private async getParticipantNames(
    tenantId: string,
    participantIds: string[],
  ): Promise<string[]> {
    try {
      const db = this.mongoClient.db(`tenant_${tenantId}`);
      const users = await db
        .collection('users')
        .find({ id: { $in: participantIds } })
        .project({ name: 1 })
        .toArray();

      return users.map((u) => u.name);
    } catch (error) {
      console.error('Failed to get participant names:', error);
      return [];
    }
  }
}
