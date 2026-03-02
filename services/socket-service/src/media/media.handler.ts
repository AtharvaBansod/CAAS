/**
 * Media Handler
 * Socket event handlers for media operations with authorization and rate limiting
 * Phase 4.5.z Task 09
 */

import { Server, Socket } from 'socket.io';
import { MediaClient } from '../clients/media-client';
import { MediaRateLimiter } from '../ratelimit/media.ratelimit';
import { MediaAuthorization } from './media.authorization';
import { getLogger } from '../utils/logger';
import { getCorrelationIdFromSocket } from '../middleware/correlation.middleware';
import { RedisClientType } from 'redis';
import { MongoClient } from 'mongodb';
import { createSocketEventResponder } from '../realtime/socket-response';
import { enforceRealtimeEventGate } from '../realtime/feature-gates';

const logger = getLogger('MediaHandler');

export interface MediaRequestUploadPayload {
  file_name: string;
  file_size: number;
  mime_type: string;
  conversation_id?: string;
}

export interface MediaUploadCompletePayload {
  file_id: string;
  conversation_id?: string;
}

export interface MediaGetDownloadUrlPayload {
  file_id: string;
}

export interface MediaDeletePayload {
  file_id: string;
}

export class MediaHandler {
  private mediaClient: MediaClient;
  private rateLimiter: MediaRateLimiter;
  private authorization: MediaAuthorization;

  constructor(
    mediaServiceUrl: string,
    redisClient: RedisClientType,
    mongoClient: MongoClient
  ) {
    this.mediaClient = new MediaClient(mediaServiceUrl);
    this.rateLimiter = new MediaRateLimiter(redisClient);
    this.authorization = new MediaAuthorization(redisClient, mongoClient);
  }

  registerHandlers(io: Server, socket: Socket, userId: string, tenantId: string): void {
    // Request upload URL
    socket.on('media:request-upload', async (payload: MediaRequestUploadPayload, callback: any) => {
      const respond = createSocketEventResponder(socket, 'media', 'media:request-upload', callback);
      if (!enforceRealtimeEventGate({
        namespace: 'media',
        event: 'media:request-upload',
        tenantId,
        userId,
      }, respond)) {
        return;
      }
      const correlationId = getCorrelationIdFromSocket(socket);
      
      try {
        logger.info({
          correlationId,
          userId,
          tenantId,
          fileName: payload.file_name,
          fileSize: payload.file_size,
          msg: 'Requesting upload URL',
        });

        // Validate payload
        if (!payload.file_name || !payload.file_size || !payload.mime_type) {
          return respond({
            status: 'error',
            message: 'Missing required fields: file_name, file_size, mime_type',
          });
        }

        // Validate file size (max 100MB)
        if (payload.file_size > 100 * 1024 * 1024) {
          return respond({
            status: 'error',
            message: 'File size exceeds maximum allowed (100MB)',
          });
        }

        // Check rate limit
        const rateLimit = await this.rateLimiter.checkUploadLimit(userId, tenantId);
        if (!rateLimit.allowed) {
          logger.warn({
            correlationId,
            userId,
            msg: 'Upload rate limit exceeded',
          });
          return respond({
            status: 'error',
            message: 'Too many upload requests. Please try again later.',
            retry_after_ms: rateLimit.retry_after_ms,
          });
        }

        // Check authorization
        const authResult = await this.authorization.canUpload(userId, tenantId);
        if (!authResult.authorized) {
          logger.warn({
            correlationId,
            userId,
            reason: authResult.reason,
            msg: 'Upload not authorized',
          });
          return respond({
            status: 'error',
            message: authResult.reason || 'Not authorized',
          });
        }

        // Request upload URL from media service
        const result = await this.mediaClient.requestUploadUrl(userId, tenantId, {
          filename: payload.file_name,
          size: payload.file_size,
          mime_type: payload.mime_type,
        });

        logger.info({
          correlationId,
          userId,
          fileId: result.file_id,
          msg: 'Upload URL generated',
        });

        respond({
          status: 'ok',
          message: 'Upload session created',
          upload_url: result.upload_url,
          file_id: result.file_id,
          expires_at: new Date(result.expires_at).getTime(),
        });
      } catch (error: any) {
        logger.error({
          correlationId,
          userId,
          error: error.message,
          msg: 'Failed to request upload URL',
        });

        respond({
          status: 'error',
          message: 'Failed to generate upload URL',
        });
      }
    });

    // Upload complete notification
    socket.on('media:upload-complete', async (payload: MediaUploadCompletePayload, callback: any) => {
      const respond = createSocketEventResponder(socket, 'media', 'media:upload-complete', callback);
      if (!enforceRealtimeEventGate({
        namespace: 'media',
        event: 'media:upload-complete',
        tenantId,
        userId,
      }, respond)) {
        return;
      }
      const correlationId = getCorrelationIdFromSocket(socket);

      try {
        logger.info({
          correlationId,
          userId,
          fileId: payload.file_id,
          msg: 'Upload complete notification',
        });

        if (!payload.file_id) {
          return respond({
            status: 'error',
            message: 'Missing required field: file_id',
          });
        }

        // Validate file upload
        const validation = await this.mediaClient.validateFileUpload(payload.file_id, userId, tenantId);

        if (!validation.valid) {
          logger.warn({
            correlationId,
            userId,
            fileId: payload.file_id,
            error: validation.error,
            msg: 'File validation failed',
          });

          return respond({
            status: 'failed',
            message: validation.error || 'File validation failed',
          });
        }

        logger.info({
          correlationId,
          userId,
          fileId: payload.file_id,
          msg: 'File upload validated',
        });

        respond({
          status: 'success',
          message: 'File upload validated',
          file_metadata: validation.metadata,
        });
      } catch (error: any) {
        logger.error({
          correlationId,
          userId,
          fileId: payload.file_id,
          error: error.message,
          msg: 'Failed to validate upload',
        });

        respond({
          status: 'failed',
          message: 'Failed to validate upload',
        });
      }
    });

    // Get download URL
    socket.on('media:get-download-url', async (payload: MediaGetDownloadUrlPayload, callback: any) => {
      const respond = createSocketEventResponder(socket, 'media', 'media:get-download-url', callback);
      if (!enforceRealtimeEventGate({
        namespace: 'media',
        event: 'media:get-download-url',
        tenantId,
        userId,
      }, respond)) {
        return;
      }
      const correlationId = getCorrelationIdFromSocket(socket);

      try {
        logger.info({
          correlationId,
          userId,
          fileId: payload.file_id,
          msg: 'Requesting download URL',
        });

        if (!payload.file_id) {
          return respond({
            status: 'error',
            message: 'Missing required field: file_id',
          });
        }

        // Check rate limit
        const rateLimit = await this.rateLimiter.checkDownloadLimit(userId, tenantId);
        if (!rateLimit.allowed) {
          logger.warn({
            correlationId,
            userId,
            msg: 'Download rate limit exceeded',
          });
          return respond({
            status: 'error',
            message: 'Too many download requests. Please try again later.',
            retry_after_ms: rateLimit.retry_after_ms,
          });
        }

        // Check authorization
        const authResult = await this.authorization.canDownload(userId, payload.file_id, tenantId);
        if (!authResult.authorized) {
          logger.warn({
            correlationId,
            userId,
            fileId: payload.file_id,
            reason: authResult.reason,
            msg: 'Download not authorized',
          });
          return respond({
            status: 'error',
            message: authResult.reason || 'Not authorized',
          });
        }

        // Get download URL from media service
        const downloadUrl = await this.mediaClient.getDownloadUrl(payload.file_id, tenantId);

        logger.info({
          correlationId,
          userId,
          fileId: payload.file_id,
          msg: 'Download URL generated',
        });

        respond({
          status: 'ok',
          message: 'Download URL generated',
          download_url: downloadUrl,
          expires_at: Date.now() + 3600000, // 1 hour
        });
      } catch (error: any) {
        logger.error({
          correlationId,
          userId,
          fileId: payload.file_id,
          error: error.message,
          msg: 'Failed to get download URL',
        });

        respond({
          status: 'error',
          message: 'Failed to generate download URL',
        });
      }
    });

    // Delete file
    socket.on('media:delete', async (payload: MediaDeletePayload, callback: any) => {
      const respond = createSocketEventResponder(socket, 'media', 'media:delete', callback);
      if (!enforceRealtimeEventGate({
        namespace: 'media',
        event: 'media:delete',
        tenantId,
        userId,
      }, respond)) {
        return;
      }
      const correlationId = getCorrelationIdFromSocket(socket);

      try {
        logger.info({
          correlationId,
          userId,
          fileId: payload.file_id,
          msg: 'Deleting file',
        });

        if (!payload.file_id) {
          return respond({
            status: 'error',
            message: 'Missing required field: file_id',
          });
        }

        // Check rate limit
        const rateLimit = await this.rateLimiter.checkDeleteLimit(userId, tenantId);
        if (!rateLimit.allowed) {
          logger.warn({
            correlationId,
            userId,
            msg: 'Delete rate limit exceeded',
          });
          return respond({
            status: 'error',
            message: 'Too many delete requests. Please try again later.',
            retry_after_ms: rateLimit.retry_after_ms,
          });
        }

        // Check authorization
        const authResult = await this.authorization.canDelete(userId, payload.file_id, tenantId);
        if (!authResult.authorized) {
          logger.warn({
            correlationId,
            userId,
            fileId: payload.file_id,
            reason: authResult.reason,
            msg: 'Delete not authorized',
          });
          return respond({
            status: 'error',
            message: authResult.reason || 'Not authorized',
          });
        }

        // Delete file via media service
        const success = await this.mediaClient.deleteFile(payload.file_id, userId, tenantId);

        if (success) {
          // Invalidate authorization cache
          await this.authorization.invalidateFileCache(payload.file_id, tenantId);

          logger.info({
            correlationId,
            userId,
            fileId: payload.file_id,
            msg: 'File deleted',
          });

          respond({
            status: 'success',
            message: 'File deleted',
          });
        } else {
          logger.warn({
            correlationId,
            userId,
            fileId: payload.file_id,
            msg: 'File deletion failed',
          });

          respond({
            status: 'failed',
            message: 'Failed to delete file',
          });
        }
      } catch (error: any) {
        logger.error({
          correlationId,
          userId,
          fileId: payload.file_id,
          error: error.message,
          msg: 'Error deleting file',
        });

        respond({
          status: 'error',
          message: 'Error deleting file',
        });
      }
    });
  }
}
