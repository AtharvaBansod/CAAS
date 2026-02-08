/**
 * Cache Invalidation Strategy
 * Handles distributed cache invalidation via Kafka events
 */

import { Producer } from 'kafkajs';

export interface InvalidationEvent {
  type: 'policy' | 'role' | 'permission' | 'user' | 'resource';
  tenant_id?: string;
  user_id?: string;
  resource_type?: string;
  resource_id?: string;
  timestamp: number;
}

export class InvalidationStrategy {
  constructor(
    private kafkaProducer: Producer,
    private topicName: string = 'authz.cache.invalidation'
  ) {}

  /**
   * Invalidate cache when policy changes
   */
  async invalidateOnPolicyChange(policyId: string, tenantId: string | null): Promise<void> {
    const event: InvalidationEvent = {
      type: 'policy',
      tenant_id: tenantId || undefined,
      timestamp: Date.now(),
    };

    await this.publishInvalidation(event);
  }

  /**
   * Invalidate cache when user role changes
   */
  async invalidateOnRoleChange(userId: string, tenantId: string): Promise<void> {
    const event: InvalidationEvent = {
      type: 'role',
      tenant_id: tenantId,
      user_id: userId,
      timestamp: Date.now(),
    };

    await this.publishInvalidation(event);
  }

  /**
   * Invalidate cache when resource permissions change
   */
  async invalidateOnResourcePermissionChange(
    resourceType: string,
    resourceId: string,
    tenantId: string
  ): Promise<void> {
    const event: InvalidationEvent = {
      type: 'resource',
      tenant_id: tenantId,
      resource_type: resourceType,
      resource_id: resourceId,
      timestamp: Date.now(),
    };

    await this.publishInvalidation(event);
  }

  /**
   * Invalidate all cache for a user
   */
  async invalidateForUser(userId: string, tenantId: string): Promise<void> {
    const event: InvalidationEvent = {
      type: 'user',
      tenant_id: tenantId,
      user_id: userId,
      timestamp: Date.now(),
    };

    await this.publishInvalidation(event);
  }

  /**
   * Publish invalidation event to Kafka
   */
  private async publishInvalidation(event: InvalidationEvent): Promise<void> {
    try {
      await this.kafkaProducer.send({
        topic: this.topicName,
        messages: [
          {
            key: event.user_id || event.tenant_id || 'global',
            value: JSON.stringify(event),
            timestamp: Date.now().toString(),
          },
        ],
      });
    } catch (error) {
      console.error('Failed to publish cache invalidation event:', error);
      // Don't throw - cache invalidation failure shouldn't break the operation
    }
  }

  /**
   * Subscribe to invalidation events (for distributed systems)
   */
  async subscribeToInvalidations(
    callback: (event: InvalidationEvent) => Promise<void>
  ): Promise<void> {
    // This would be implemented in a consumer service
    // For now, just a placeholder
    console.log('Invalidation subscription would be set up here');
  }
}
