/**
 * Media Client
 * Integration with media service for file handling
 */

import axios, { AxiosInstance } from 'axios';

export interface FileMetadata {
  filename: string;
  size: number;
  mime_type: string;
  checksum?: string;
}

export interface UploadUrlResponse {
  upload_url: string;
  file_id: string;
  expires_at: string;
}

export interface FileValidationResult {
  valid: boolean;
  file_id: string;
  metadata?: any;
  error?: string;
}

export class MediaClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private serviceSecret: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.serviceSecret = process.env.SERVICE_SECRET || 'dev-service-secret';
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async requestUploadUrl(
    userId: string,
    tenantId: string,
    fileMetadata: FileMetadata
  ): Promise<UploadUrlResponse> {
    try {
      const chunkSize = Math.min(fileMetadata.size, 5 * 1024 * 1024);
      const response = await this.client.post(
        '/upload/chunk',
        {
          filename: fileMetadata.filename,
          total_size: fileMetadata.size,
          chunk_size: chunkSize,
          mimetype: fileMetadata.mime_type,
        },
        {
          headers: this.buildInternalHeaders(userId, tenantId),
        }
      );

      return {
        upload_url: `${this.baseUrl}/upload/chunk/${response.data.upload_id}`,
        file_id: response.data.upload_id,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      };
    } catch (error: any) {
      console.error('[MediaClient] Failed to request upload URL:', error.message);
      throw new Error(`Failed to request upload URL: ${error.message}`);
    }
  }

  async validateFileUpload(fileId: string, userId: string, tenantId: string): Promise<FileValidationResult> {
    try {
      const response = await this.client.get(`/files/${fileId}`, {
        headers: this.buildInternalHeaders(userId, tenantId),
      });

      return {
        valid: true,
        file_id: fileId,
        metadata: response.data,
      };
    } catch (error: any) {
      console.error('[MediaClient] File validation failed:', error.message);
      return {
        valid: false,
        file_id: fileId,
        error: error.message,
      };
    }
  }

  private buildInternalHeaders(userId: string, tenantId: string): Record<string, string> {
    return {
      'x-service-secret': this.serviceSecret,
      'x-user-id': userId,
      'x-tenant-id': tenantId,
    };
  }

  async getFileMetadata(fileId: string, tenantId: string): Promise<any> {
    try {
      const response = await this.client.get(`/files/${fileId}`, {
        headers: {
          'x-service-secret': this.serviceSecret,
          'x-user-id': 'system',
          'x-tenant-id': tenantId,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error('[MediaClient] Failed to get file metadata:', error.message);
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }
  }

  async deleteFile(fileId: string, userId: string, tenantId: string): Promise<boolean> {
    try {
      await this.client.delete(`/files/${fileId}`, {
        headers: this.buildInternalHeaders(userId, tenantId),
      });

      return true;
    } catch (error: any) {
      console.error('[MediaClient] Failed to delete file:', error.message);
      return false;
    }
  }

  async getDownloadUrl(fileId: string, tenantId: string): Promise<string> {
    try {
      const response = await this.client.get(`/download/${fileId}/signed`, {
        headers: {
          'x-service-secret': this.serviceSecret,
          'x-user-id': 'system',
          'x-tenant-id': tenantId,
        },
      });

      return response.data.url;
    } catch (error: any) {
      console.error('[MediaClient] Failed to get download URL:', error.message);
      throw new Error(`Failed to get download URL: ${error.message}`);
    }
  }
}
