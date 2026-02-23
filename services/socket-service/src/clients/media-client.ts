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

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
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
      const response = await this.client.post('/api/media/upload-url', {
        user_id: userId,
        tenant_id: tenantId,
        ...fileMetadata,
      });

      return response.data;
    } catch (error: any) {
      console.error('[MediaClient] Failed to request upload URL:', error.message);
      throw new Error(`Failed to request upload URL: ${error.message}`);
    }
  }

  async validateFileUpload(fileId: string, userId: string, tenantId: string): Promise<FileValidationResult> {
    try {
      const response = await this.client.get(`/api/media/validate/${fileId}`, {
        params: {
          user_id: userId,
          tenant_id: tenantId,
        },
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

  async getFileMetadata(fileId: string, tenantId: string): Promise<any> {
    try {
      const response = await this.client.get(`/api/media/metadata/${fileId}`, {
        params: {
          tenant_id: tenantId,
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
      await this.client.delete(`/api/media/${fileId}`, {
        data: {
          user_id: userId,
          tenant_id: tenantId,
        },
      });

      return true;
    } catch (error: any) {
      console.error('[MediaClient] Failed to delete file:', error.message);
      return false;
    }
  }

  async getDownloadUrl(fileId: string, tenantId: string): Promise<string> {
    try {
      const response = await this.client.get(`/api/media/download-url/${fileId}`, {
        params: {
          tenant_id: tenantId,
        },
      });

      return response.data.download_url;
    } catch (error: any) {
      console.error('[MediaClient] Failed to get download URL:', error.message);
      throw new Error(`Failed to get download URL: ${error.message}`);
    }
  }
}
