/**
 * Search Client
 * Integration with search service for message indexing
 */

import axios, { AxiosInstance } from 'axios';

export interface MessageIndexData {
  message_id: string;
  conversation_id: string;
  tenant_id: string;
  sender_id: string;
  content: string;
  created_at: Date;
  metadata?: Record<string, any>;
}

export class SearchClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async indexMessage(message: MessageIndexData): Promise<void> {
    try {
      await this.client.post('/api/search/index', {
        ...message,
        created_at: message.created_at.toISOString(),
      });
    } catch (error: any) {
      // Non-blocking - log error but don't throw
      console.error('[SearchClient] Failed to index message:', error.message);
    }
  }

  async updateMessageIndex(messageId: string, tenantId: string, newContent: string): Promise<void> {
    try {
      await this.client.put(`/api/search/index/${messageId}`, {
        tenant_id: tenantId,
        content: newContent,
        updated_at: new Date().toISOString(),
      });
    } catch (error: any) {
      // Non-blocking - log error but don't throw
      console.error('[SearchClient] Failed to update message index:', error.message);
    }
  }

  async removeFromIndex(messageId: string, tenantId: string): Promise<void> {
    try {
      await this.client.delete(`/api/search/index/${messageId}`, {
        data: {
          tenant_id: tenantId,
        },
      });
    } catch (error: any) {
      // Non-blocking - log error but don't throw
      console.error('[SearchClient] Failed to remove message from index:', error.message);
    }
  }

  async indexBatch(messages: MessageIndexData[]): Promise<void> {
    try {
      await this.client.post('/api/search/index/batch', {
        messages: messages.map(m => ({
          ...m,
          created_at: m.created_at.toISOString(),
        })),
      });
    } catch (error: any) {
      // Non-blocking - log error but don't throw
      console.error('[SearchClient] Failed to index message batch:', error.message);
    }
  }
}
