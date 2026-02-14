import axios, { AxiosInstance, AxiosError } from 'axios';
import CircuitBreaker, { CircuitBreakerInstance } from 'opossum';
import FormData from 'form-data';

interface CircuitBreakerOptions {
  timeout: number;
  errorThresholdPercentage: number;
  resetTimeout: number;
}

export class MediaClient {
  private client: AxiosInstance;
  private breaker: CircuitBreakerInstance;

  constructor(baseURL: string, options?: Partial<CircuitBreakerOptions>) {
    this.client = axios.create({
      baseURL,
      timeout: 300000, // 5 minutes for large uploads
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });

    // Circuit breaker configuration
    const breakerOptions = {
      timeout: options?.timeout || 5000,
      errorThresholdPercentage: options?.errorThresholdPercentage || 50,
      resetTimeout: options?.resetTimeout || 30000,
    };

    this.breaker = new CircuitBreaker(this.makeRequest.bind(this), breakerOptions);

    this.breaker.on('open', () => {
      console.warn('Media service circuit breaker opened');
    });

    this.breaker.on('halfOpen', () => {
      console.info('Media service circuit breaker half-open');
    });

    this.breaker.on('close', () => {
      console.info('Media service circuit breaker closed');
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

  async uploadFile(token: string, file: any, metadata?: any): Promise<any> {
    const formData = new FormData();
    formData.append('file', file.data, {
      filename: file.filename,
      contentType: file.mimetype,
    });

    if (metadata) {
      Object.keys(metadata).forEach((key) => {
        formData.append(key, metadata[key]);
      });
    }

    return this.breaker.fire({
      method: 'POST',
      url: '/upload',
      headers: {
        Authorization: `Bearer ${token}`,
        ...formData.getHeaders(),
      },
      data: formData,
    });
  }

  async initiateChunkedUpload(
    token: string,
    filename: string,
    totalSize: number,
    chunkSize: number,
    mimetype: string
  ): Promise<any> {
    return this.breaker.fire({
      method: 'POST',
      url: '/upload/chunk',
      headers: { Authorization: `Bearer ${token}` },
      data: {
        filename,
        total_size: totalSize,
        chunk_size: chunkSize,
        mimetype,
      },
    });
  }

  async uploadChunk(
    token: string,
    uploadId: string,
    chunkNumber: number,
    chunkData: Buffer
  ): Promise<any> {
    const formData = new FormData();
    formData.append('chunk', chunkData);

    return this.breaker.fire({
      method: 'POST',
      url: `/upload/chunk/${uploadId}`,
      params: { chunk_number: chunkNumber },
      headers: {
        Authorization: `Bearer ${token}`,
        ...formData.getHeaders(),
      },
      data: formData,
    });
  }

  async completeChunkedUpload(token: string, uploadId: string): Promise<any> {
    return this.breaker.fire({
      method: 'POST',
      url: `/upload/complete/${uploadId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async getUploadProgress(token: string, uploadId: string): Promise<any> {
    return this.breaker.fire({
      method: 'GET',
      url: `/upload/${uploadId}/progress`,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async downloadFile(token: string, fileId: string): Promise<any> {
    return this.breaker.fire({
      method: 'GET',
      url: `/download/${fileId}`,
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'stream',
    });
  }

  async getSignedUrl(token: string, fileId: string): Promise<any> {
    return this.breaker.fire({
      method: 'GET',
      url: `/download/${fileId}/signed`,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async streamFile(token: string, fileId: string, range?: string): Promise<any> {
    const headers: any = { Authorization: `Bearer ${token}` };
    if (range) {
      headers.Range = range;
    }

    return this.breaker.fire({
      method: 'GET',
      url: `/stream/${fileId}`,
      headers,
      responseType: 'stream',
    });
  }

  async getFileMetadata(token: string, fileId: string): Promise<any> {
    return this.breaker.fire({
      method: 'GET',
      url: `/files/${fileId}`,
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async deleteFile(token: string, fileId: string): Promise<any> {
    return this.breaker.fire({
      method: 'DELETE',
      url: `/files/${fileId}`,
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
let mediaClient: MediaClient | null = null;

export function getMediaClient(): MediaClient {
  if (!mediaClient) {
    const baseURL = process.env.MEDIA_SERVICE_URL || 'http://media-service:3005';
    mediaClient = new MediaClient(baseURL);
  }
  return mediaClient;
}
