import { RedisClientType } from 'redis';
import { getLogger } from './utils/logger';

const logger = getLogger('SessionManager');

export class SessionManager {
  private readonly USER_SOCKETS_PREFIX = 'user:sockets:'; // Set of socket IDs for a user

  constructor(private redisClient: RedisClientType) {}

  /**
   * Binds a socket ID to a user ID in Redis.
   * Stores the socket ID in a set associated with the user ID.
   * @param userId The ID of the user.
   * @param socketId The ID of the socket.
   */
  async bindSocketToUser(userId: string, socketId: string): Promise<void> {
    const key = `${this.USER_SOCKETS_PREFIX}${userId}`;
    await this.redisClient.sAdd(key, socketId);
    logger.info(`Bound socket ${socketId} to user ${userId}`);
  }

  /**
   * Unbinds a socket ID from a user ID in Redis.
   * Removes the socket ID from the set associated with the user ID.
   * @param userId The ID of the user.
   * @param socketId The ID of the socket.
   */
  async unbindSocketFromUser(userId: string, socketId: string): Promise<void> {
    const key = `${this.USER_SOCKETS_PREFIX}${userId}`;
    await this.redisClient.sRem(key, socketId);
    logger.info(`Unbound socket ${socketId} from user ${userId}`);
  }

  /**
   * Retrieves all active socket IDs for a given user ID.
   * @param userId The ID of the user.
   * @returns A set of socket IDs.
   */
  async getUserSockets(userId: string): Promise<Set<string>> {
    const key = `${this.USER_SOCKETS_PREFIX}${userId}`;
    const socketIds = await this.redisClient.sMembers(key);
    logger.debug(`Retrieved sockets for user ${userId}: ${Array.from(socketIds).join(', ')}`);
    return new Set(socketIds);
  }

  /**
   * Cleans up all socket bindings for a given user.
   * This might be useful if a user logs out from all devices or for maintenance.
   * @param userId The ID of the user.
   */
  async clearUserSockets(userId: string): Promise<void> {
    const key = `${this.USER_SOCKETS_PREFIX}${userId}`;
    await this.redisClient.del(key);
    logger.info(`Cleared all socket bindings for user ${userId}`);
  }
}
