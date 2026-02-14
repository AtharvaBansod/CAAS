import { Socket } from 'socket.io';
import { Logger } from 'pino';
import { PreKeyBundleManager } from './prekey-bundle-manager';

interface X3DHInitiation {
  initiatorId: string;
  responderId: string;
  identityKey: string;
  ephemeralKey: string;
  oneTimePreKeyId?: number;
  initialMessage?: string;
}

interface X3DHResponse {
  responderId: string;
  identityKey: string;
  ephemeralKey: string;
  accepted: boolean;
}

export class E2EKeyExchange {
  private bundleManager: PreKeyBundleManager;
  private logger: Logger;

  constructor(bundleManager: PreKeyBundleManager, logger: Logger) {
    this.bundleManager = bundleManager;
    this.logger = logger;
  }

  /**
   * Handle pre-key bundle request
   */
  async handleRequestPreKeyBundle(
    socket: Socket,
    data: { targetUserId: string }
  ): Promise<void> {
    const userId = socket.data.userId;
    const { targetUserId } = data;

    try {
      this.logger.info({ userId, targetUserId }, 'Pre-key bundle requested');

      const bundle = await this.bundleManager.requestBundle(userId, targetUserId);

      if (!bundle) {
        socket.emit('e2e:prekey_bundle_response', {
          success: false,
          error: 'Bundle not found',
          targetUserId,
        });
        return;
      }

      socket.emit('e2e:prekey_bundle_response', {
        success: true,
        targetUserId,
        bundle,
      });
    } catch (error) {
      this.logger.error({ error, userId, targetUserId }, 'Failed to request pre-key bundle');
      
      socket.emit('e2e:prekey_bundle_response', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        targetUserId,
      });
    }
  }

  /**
   * Handle pre-key bundle publication
   */
  async handlePublishPreKeyBundle(
    socket: Socket,
    data: {
      identityKey: string;
      signedPreKey: {
        keyId: number;
        publicKey: string;
        signature: string;
      };
      oneTimePreKeys: Array<{
        keyId: number;
        publicKey: string;
      }>;
    }
  ): Promise<void> {
    const userId = socket.data.userId;

    try {
      this.logger.info({ userId }, 'Publishing pre-key bundle');

      await this.bundleManager.publishBundle(userId, data);

      socket.emit('e2e:publish_prekey_bundle_response', {
        success: true,
      });
    } catch (error) {
      this.logger.error({ error, userId }, 'Failed to publish pre-key bundle');
      
      socket.emit('e2e:publish_prekey_bundle_response', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Handle X3DH initiation
   */
  async handleX3DHInitiation(
    socket: Socket,
    io: any,
    data: X3DHInitiation
  ): Promise<void> {
    const userId = socket.data.userId;
    const { responderId, identityKey, ephemeralKey, oneTimePreKeyId, initialMessage } = data;

    try {
      this.logger.info({ userId, responderId }, 'X3DH initiation');

      // Verify the initiator has the responder's bundle
      const bundle = await this.bundleManager.requestBundle(userId, responderId);
      
      if (!bundle) {
        socket.emit('e2e:x3dh_initiation_response', {
          success: false,
          error: 'Responder bundle not found',
        });
        return;
      }

      // If one-time pre-key was used, mark it as consumed
      if (oneTimePreKeyId) {
        await this.bundleManager.removeUsedPreKey(responderId, `${responderId}:${oneTimePreKeyId}`);
      }

      // Forward initiation to responder
      io.to(`user:${responderId}`).emit('e2e:x3dh_initiate', {
        initiatorId: userId,
        identityKey,
        ephemeralKey,
        oneTimePreKeyId,
        initialMessage,
        timestamp: Date.now(),
      });

      socket.emit('e2e:x3dh_initiation_response', {
        success: true,
        responderId,
      });

      this.logger.info({ userId, responderId }, 'X3DH initiation forwarded');
    } catch (error) {
      this.logger.error({ error, userId, responderId }, 'Failed to initiate X3DH');
      
      socket.emit('e2e:x3dh_initiation_response', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Handle X3DH response
   */
  async handleX3DHResponse(
    socket: Socket,
    io: any,
    data: X3DHResponse
  ): Promise<void> {
    const userId = socket.data.userId;
    const { responderId, identityKey, ephemeralKey, accepted } = data;

    try {
      this.logger.info({ userId, responderId, accepted }, 'X3DH response');

      // Forward response to initiator
      io.to(`user:${responderId}`).emit('e2e:x3dh_respond', {
        responderId: userId,
        identityKey,
        ephemeralKey,
        accepted,
        timestamp: Date.now(),
      });

      socket.emit('e2e:x3dh_response_sent', {
        success: true,
      });

      this.logger.info({ userId, responderId }, 'X3DH response forwarded');
    } catch (error) {
      this.logger.error({ error, userId, responderId }, 'Failed to respond to X3DH');
      
      socket.emit('e2e:x3dh_response_sent', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Check if bundle rotation is needed
   */
  async checkRotation(userId: string): Promise<boolean> {
    return this.bundleManager.checkBundleRotation(userId);
  }
}
