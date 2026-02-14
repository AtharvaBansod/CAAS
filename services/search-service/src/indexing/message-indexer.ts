import { Client } from '@elastic/elasticsearch';
import { Message } from '../types';

export class MessageIndexer {
  constructor(private esClient: Client) {}

  async indexMessage(message: Message): Promise<void> {
    try {
      await this.esClient.index({
        index: 'messages',
        id: message.id,
        document: {
          id: message.id,
          conversation_id: message.conversation_id,
          tenant_id: message.tenant_id,
          sender_id: message.sender_id,
          type: message.type,
          content: this.extractSearchableContent(message),
          mentions: message.mentions || [],
          created_at: message.created_at,
          updated_at: message.updated_at,
        },
      });
      console.log(`Indexed message: ${message.id}`);
    } catch (error) {
      console.error(`Failed to index message ${message.id}:`, error);
      throw error;
    }
  }

  async updateMessage(message: Message): Promise<void> {
    try {
      await this.esClient.update({
        index: 'messages',
        id: message.id,
        doc: {
          content: this.extractSearchableContent(message),
          updated_at: message.updated_at,
        },
      });
      console.log(`Updated message: ${message.id}`);
    } catch (error) {
      console.error(`Failed to update message ${message.id}:`, error);
      throw error;
    }
  }

  async deleteMessage(messageId: string): Promise<void> {
    try {
      await this.esClient.delete({
        index: 'messages',
        id: messageId,
      });
      console.log(`Deleted message: ${messageId}`);
    } catch (error) {
      console.error(`Failed to delete message ${messageId}:`, error);
      throw error;
    }
  }

  async bulkIndex(messages: Message[]): Promise<void> {
    if (messages.length === 0) return;

    const operations = messages.flatMap((msg) => [
      { index: { _index: 'messages', _id: msg.id } },
      this.toDocument(msg),
    ]);

    try {
      const result = await this.esClient.bulk({ operations });
      if (result.errors) {
        console.error('Bulk indexing had errors:', result.items);
      } else {
        console.log(`Bulk indexed ${messages.length} messages`);
      }
    } catch (error) {
      console.error('Failed to bulk index messages:', error);
      throw error;
    }
  }

  private extractSearchableContent(message: Message): string {
    switch (message.type) {
      case 'text':
        return message.content?.text || '';
      case 'media':
        return message.content?.media?.map((m: any) => m.filename).join(' ') || '';
      case 'system':
        return message.content?.text || '';
      case 'card':
        return `${message.content?.title || ''} ${message.content?.description || ''}`;
      case 'location':
        return message.content?.name || '';
      case 'contact':
        return message.content?.name || '';
      case 'poll':
        return `${message.content?.question || ''} ${message.content?.options?.join(' ') || ''}`;
      default:
        return '';
    }
  }

  private toDocument(message: Message): any {
    return {
      id: message.id,
      conversation_id: message.conversation_id,
      tenant_id: message.tenant_id,
      sender_id: message.sender_id,
      type: message.type,
      content: this.extractSearchableContent(message),
      mentions: message.mentions || [],
      created_at: message.created_at,
      updated_at: message.updated_at,
    };
  }
}
