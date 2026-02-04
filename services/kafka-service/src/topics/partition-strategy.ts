import { createHash } from 'crypto';
import { PARTITION_STRATEGIES } from '../config/constants';
import { PartitionKeyResult } from './types';

export interface PartitionContext {
  tenantId?: string;
  userId?: string;
  conversationId?: string;
  messageId?: string;
  [key: string]: any;
}

export class PartitionStrategy {
  /**
   * Calculate partition key based on strategy and context
   */
  public static calculatePartitionKey(
    strategy: string,
    context: PartitionContext,
    totalPartitions?: number
  ): PartitionKeyResult {
    switch (strategy) {
      case PARTITION_STRATEGIES.CONVERSATION_ID:
        return this.conversationIdStrategy(context, totalPartitions);
      
      case PARTITION_STRATEGIES.USER_ID:
        return this.userIdStrategy(context, totalPartitions);
      
      case PARTITION_STRATEGIES.TENANT_ID:
        return this.tenantIdStrategy(context, totalPartitions);
      
      case PARTITION_STRATEGIES.RANDOM:
        return this.randomStrategy(totalPartitions);
      
      default:
        throw new Error(`Unknown partition strategy: ${strategy}`);
    }
  }

  /**
   * Conversation ID strategy - ensures message ordering per conversation
   */
  private static conversationIdStrategy(
    context: PartitionContext,
    totalPartitions?: number
  ): PartitionKeyResult {
    if (!context.conversationId) {
      throw new Error('conversationId is required for CONVERSATION_ID partition strategy');
    }

    const key = context.conversationId;
    const partition = totalPartitions ? this.hashToPartition(key, totalPartitions) : undefined;

    return { key, partition };
  }

  /**
   * User ID strategy - groups events by user
   */
  private static userIdStrategy(
    context: PartitionContext,
    totalPartitions?: number
  ): PartitionKeyResult {
    if (!context.userId) {
      throw new Error('userId is required for USER_ID partition strategy');
    }

    const key = context.userId;
    const partition = totalPartitions ? this.hashToPartition(key, totalPartitions) : undefined;

    return { key, partition };
  }

  /**
   * Tenant ID strategy - groups events by tenant
   */
  private static tenantIdStrategy(
    context: PartitionContext,
    totalPartitions?: number
  ): PartitionKeyResult {
    if (!context.tenantId) {
      throw new Error('tenantId is required for TENANT_ID partition strategy');
    }

    const key = context.tenantId;
    const partition = totalPartitions ? this.hashToPartition(key, totalPartitions) : undefined;

    return { key, partition };
  }

  /**
   * Random strategy - distributes load evenly
   */
  private static randomStrategy(totalPartitions?: number): PartitionKeyResult {
    const key = this.generateRandomKey();
    const partition = totalPartitions ? Math.floor(Math.random() * totalPartitions) : undefined;

    return { key, partition };
  }

  /**
   * Hash a key to a partition number
   */
  private static hashToPartition(key: string, totalPartitions: number): number {
    const hash = createHash('md5').update(key).digest('hex');
    const hashInt = parseInt(hash.substring(0, 8), 16);
    return Math.abs(hashInt) % totalPartitions;
  }

  /**
   * Generate a random key
   */
  private static generateRandomKey(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Validate partition context for a given strategy
   */
  public static validateContext(strategy: string, context: PartitionContext): void {
    switch (strategy) {
      case PARTITION_STRATEGIES.CONVERSATION_ID:
        if (!context.conversationId) {
          throw new Error('conversationId is required for CONVERSATION_ID partition strategy');
        }
        break;
      
      case PARTITION_STRATEGIES.USER_ID:
        if (!context.userId) {
          throw new Error('userId is required for USER_ID partition strategy');
        }
        break;
      
      case PARTITION_STRATEGIES.TENANT_ID:
        if (!context.tenantId) {
          throw new Error('tenantId is required for TENANT_ID partition strategy');
        }
        break;
      
      case PARTITION_STRATEGIES.RANDOM:
        // No validation needed for random strategy
        break;
      
      default:
        throw new Error(`Unknown partition strategy: ${strategy}`);
    }
  }

  /**
   * Get recommended partition count based on strategy and expected load
   */
  public static getRecommendedPartitions(
    strategy: string,
    expectedLoad: {
      messagesPerSecond?: number;
      uniqueKeys?: number;
      consumers?: number;
    }
  ): number {
    const { messagesPerSecond = 100, uniqueKeys = 1000, consumers = 1 } = expectedLoad;

    switch (strategy) {
      case PARTITION_STRATEGIES.CONVERSATION_ID:
        // For conversation ordering, balance between parallelism and ordering
        // Aim for ~1000 messages per partition per second max
        return Math.max(Math.ceil(messagesPerSecond / 1000), consumers, 4);
      
      case PARTITION_STRATEGIES.USER_ID:
        // For user-based partitioning, consider unique users
        // Aim for ~100-500 users per partition
        return Math.max(Math.ceil(uniqueKeys / 300), consumers, 4);
      
      case PARTITION_STRATEGIES.TENANT_ID:
        // For tenant-based partitioning, fewer partitions usually needed
        // Most deployments have < 100 tenants
        return Math.max(Math.ceil(uniqueKeys / 10), consumers, 4);
      
      case PARTITION_STRATEGIES.RANDOM:
        // For random distribution, optimize for throughput
        // Aim for ~500 messages per partition per second
        return Math.max(Math.ceil(messagesPerSecond / 500), consumers, 4);
      
      default:
        return 4; // Default fallback
    }
  }

  /**
   * Create partition key for message envelope
   */
  public static createMessageKey(
    strategy: string,
    messageData: {
      tenantId: string;
      userId?: string;
      conversationId?: string;
      messageId?: string;
    }
  ): string {
    const context: PartitionContext = {
      tenantId: messageData.tenantId,
      userId: messageData.userId,
      conversationId: messageData.conversationId,
      messageId: messageData.messageId,
    };

    this.validateContext(strategy, context);
    const result = this.calculatePartitionKey(strategy, context);
    return result.key;
  }
}