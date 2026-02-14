import axios, { AxiosInstance, AxiosError } from 'axios';
import CircuitBreaker, { CircuitBreakerInstance } from 'opossum';

interface CircuitBreakerOptions {
  timeout: number;
  errorThresholdPercentage: number;
  resetTimeout: number;
}

export class MessagingClient {
  private client: AxiosInstance;
  private breaker: CircuitBreakerInstance;

  constructor(baseURL: string, options?: Partial<CircuitBreakerOptions>) {
    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Circuit breaker configuration
    const breakerOptions = {
      timeout: options?.timeout || 3000,
      errorThresholdPercentage: options?.errorThresholdPercentage || 50,
      resetTimeout: options?.resetTimeout || 30000,
    };

    this.breaker = new CircuitBreaker(this.makeRequest.bind(this), breakerOptions);

    this.breaker.on('open', () => {
      console.warn('Messaging service circuit breaker opened');
    });

    this.breaker.on('halfOpen', () => {
      console.info('Messaging service circuit breaker half-open');
    });

    this.breaker.on('close', () => {
      console.info('Messaging service circuit breaker closed');
    });
  }

  private async makeRequest(config: any): Promise<any> {
    try {
      const response = await this.client.request(config);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        throw {
          status: axiosError.response?.status || 500,
          message: axiosError.message,
          data: axiosError.response?.data,
        };
      }
      throw error;
    }
  }

  async sendMessage(token: string, data: any): Promise<any> {
    return this.breaker.fire({
      method: 'POST',
      url: '/messages',
      headers: { Authorization: `Bearer ${token}` },
      data,
    });
  }

  async listMessages(token: string, conversationId: string, query: any): Promise<any> {
    return this.breaker.fire({
      method: 'GET',
      url: `/conversations/${conversationId}/messages`,
      headers: { Authorization: `Bearer ${token}` },
      params: query,
    });
  }

  async getMessage(token: string, messageId: string): Promise<any> {
    return this.breaker.fire({
      method: 'GET',
      url: `/messages/${messageId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async editMessage(token: string, messageId: string, data: any): Promise<any> {
    return this.breaker.fire({
      method: 'PUT',
      url: `/messages/${messageId}`,
      headers: { Authorization: `Bearer ${token}` },
      data,
    });
  }

  async deleteMessage(token: string, messageId: string): Promise<any> {
    return this.breaker.fire({
      method: 'DELETE',
      url: `/messages/${messageId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async addReaction(token: string, messageId: string, data: any): Promise<any> {
    return this.breaker.fire({
      method: 'POST',
      url: `/messages/${messageId}/reactions`,
      headers: { Authorization: `Bearer ${token}` },
      data,
    });
  }

  async removeReaction(token: string, messageId: string, reaction: string): Promise<any> {
    return this.breaker.fire({
      method: 'DELETE',
      url: `/messages/${messageId}/reactions/${reaction}`,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async createConversation(token: string, data: any): Promise<any> {
    return this.breaker.fire({
      method: 'POST',
      url: '/conversations',
      headers: { Authorization: `Bearer ${token}` },
      data,
    });
  }

  async listConversations(token: string, query: any): Promise<any> {
    return this.breaker.fire({
      method: 'GET',
      url: '/conversations',
      headers: { Authorization: `Bearer ${token}` },
      params: query,
    });
  }

  async getConversation(token: string, conversationId: string): Promise<any> {
    return this.breaker.fire({
      method: 'GET',
      url: `/conversations/${conversationId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async updateConversation(token: string, conversationId: string, data: any): Promise<any> {
    return this.breaker.fire({
      method: 'PUT',
      url: `/conversations/${conversationId}`,
      headers: { Authorization: `Bearer ${token}` },
      data,
    });
  }

  async deleteConversation(token: string, conversationId: string): Promise<any> {
    return this.breaker.fire({
      method: 'DELETE',
      url: `/conversations/${conversationId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async addMember(token: string, conversationId: string, data: any): Promise<any> {
    return this.breaker.fire({
      method: 'POST',
      url: `/conversations/${conversationId}/members`,
      headers: { Authorization: `Bearer ${token}` },
      data,
    });
  }

  async removeMember(token: string, conversationId: string, userId: string): Promise<any> {
    return this.breaker.fire({
      method: 'DELETE',
      url: `/conversations/${conversationId}/members/${userId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async updateMemberRole(token: string, conversationId: string, userId: string, data: any): Promise<any> {
    return this.breaker.fire({
      method: 'PUT',
      url: `/conversations/${conversationId}/members/${userId}/role`,
      headers: { Authorization: `Bearer ${token}` },
      data,
    });
  }

  async healthCheck(): Promise<any> {
    return this.breaker.fire({
      method: 'GET',
      url: '/health',
    });
  }
}

// Singleton instance
let messagingClient: MessagingClient | null = null;

export function getMessagingClient(): MessagingClient {
  if (!messagingClient) {
    const baseURL = process.env.MESSAGING_SERVICE_URL || 'http://messaging-service:3004';
    messagingClient = new MessagingClient(baseURL);
  }
  return messagingClient;
}
