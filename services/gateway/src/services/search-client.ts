import axios, { AxiosInstance, AxiosError } from 'axios';
import CircuitBreaker, { CircuitBreakerInstance } from 'opossum';

interface CircuitBreakerOptions {
  timeout: number;
  errorThresholdPercentage: number;
  resetTimeout: number;
}

export class SearchClient {
  private client: AxiosInstance;
  private breaker: CircuitBreakerInstance;

  constructor(baseURL: string, options?: Partial<CircuitBreakerOptions>) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
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
      console.warn('Search service circuit breaker opened');
    });

    this.breaker.on('halfOpen', () => {
      console.info('Search service circuit breaker half-open');
    });

    this.breaker.on('close', () => {
      console.info('Search service circuit breaker closed');
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

  async searchMessages(token: string, query: any): Promise<any> {
    return this.breaker.fire({
      method: 'GET',
      url: '/search/messages',
      headers: { Authorization: `Bearer ${token}` },
      params: query,
    });
  }

  async searchConversations(token: string, query: any): Promise<any> {
    return this.breaker.fire({
      method: 'GET',
      url: '/search/conversations',
      headers: { Authorization: `Bearer ${token}` },
      params: query,
    });
  }

  async searchUsers(token: string, query: any): Promise<any> {
    return this.breaker.fire({
      method: 'GET',
      url: '/search/users',
      headers: { Authorization: `Bearer ${token}` },
      params: query,
    });
  }

  async globalSearch(token: string, query: any): Promise<any> {
    return this.breaker.fire({
      method: 'GET',
      url: '/search',
      headers: { Authorization: `Bearer ${token}` },
      params: query,
    });
  }

  async getSuggestions(token: string, query: string): Promise<any> {
    return this.breaker.fire({
      method: 'GET',
      url: '/search/suggestions',
      headers: { Authorization: `Bearer ${token}` },
      params: { q: query },
    });
  }

  async getRecentSearches(token: string): Promise<any> {
    return this.breaker.fire({
      method: 'GET',
      url: '/search/recent',
      headers: { Authorization: `Bearer ${token}` },
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
let searchClient: SearchClient | null = null;

export function getSearchClient(): SearchClient {
  if (!searchClient) {
    const baseURL = process.env.SEARCH_SERVICE_URL || 'http://search-service:3006';
    searchClient = new SearchClient(baseURL);
  }
  return searchClient;
}
