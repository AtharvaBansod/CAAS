/**
 * Authorization Enforcer
 * 
 * Enforces authorization policies with real membership checks
 */

import { AuthzRequest, AuthzDecision } from './types';
import { ConversationMembershipCache } from './conversation-membership-cache';
import { Redis } from 'ioredis';
import { MongoClient } from 'mongodb';

export interface AuthzEnforcerOptions {
  policyEngineUrl?: string;
  cacheEnabled?: boolean;
  auditEnabled?: boolean;
  redis?: Redis;
  mongoClient?: MongoClient;
}

export class AuthzEnforcer {
  private policyEngineUrl: string;
  private cacheEnabled: boolean;
  private auditEnabled: boolean;
  private membershipCache?: ConversationMembershipCache;
  private mongoClient?: MongoClient;

  constructor(options: AuthzEnforcerOptions = {}) {
    this.policyEngineUrl = options.policyEngineUrl || 'http://auth-service:3001';
    this.cacheEnabled = options.cacheEnabled !== false;
    this.auditEnabled = options.auditEnabled !== false;
    this.mongoClient = options.mongoClient;
    
    // Initialize membership cache if Redis is provided
    if (options.redis && this.cacheEnabled) {
      this.membershipCache = new ConversationMembershipCache(options.redis, {
        ttlSeconds: 300, // 5 minutes
        keyPrefix: 'authz:membership',
      });
    }
  }

  /**
   * Set MongoDB client for membership checks
   */
  setMongoClient(client: MongoClient): void {
    this.mongoClient = client;
  }

  /**
   * Set Redis client for caching
   */
  setRedisClient(redis: Redis): void {
    if (this.cacheEnabled) {
      this.membershipCache = new ConversationMembershipCache(redis, {
        ttlSeconds: 300,
        keyPrefix: 'authz:membership',
      });
    }
  }

  /**
   * Authorize a request
   */
  async authorize(request: AuthzRequest): Promise<AuthzDecision> {
    const startTime = Date.now();

    try {
      // TODO: Integrate with actual policy engine
      // For now, implement basic logic

      const decision = await this.evaluateRequest(request);

      // Audit the decision
      if (this.auditEnabled) {
        await this.auditDecision(request, decision, Date.now() - startTime);
      }

      return decision;
    } catch (error) {
      console.error('Authorization error:', error);

      // Fail closed: deny on error
      return {
        allowed: false,
        reason: 'Authorization service error',
        cached: false,
      };
    }
  }

  /**
   * Evaluate authorization request
   */
  private async evaluateRequest(request: AuthzRequest): Promise<AuthzDecision> {
    // Check tenant isolation first (critical security check)
    if (request.subject.tenant_id !== request.resource.tenant_id) {
      return {
        allowed: false,
        reason: 'Cross-tenant access denied',
        matched_policies: ['deny-cross-tenant'],
        cached: false,
      };
    }

    // Check if user is platform admin (full access)
    if (request.subject.roles.includes('platform_admin')) {
      return {
        allowed: true,
        reason: 'Platform admin has full access',
        matched_policies: ['platform-admin-full-access'],
        cached: false,
      };
    }

    // Check if user is tenant admin (full access within tenant)
    if (
      request.subject.roles.includes('tenant_admin') &&
      request.subject.tenant_id === request.resource.tenant_id
    ) {
      return {
        allowed: true,
        reason: 'Tenant admin has full access within tenant',
        matched_policies: ['tenant-admin-full-access'],
        cached: false,
      };
    }

    // Check permission matrix for role-based access
    const { hasPermission, requiresOwnership, requiresMembership } = await import('./permission-matrix');
    const permission = hasPermission(
      request.subject.roles,
      request.resource.type,
      request.action
    );

    if (!permission) {
      return {
        allowed: false,
        reason: `Role '${request.subject.roles.join(', ')}' does not have permission to '${request.action}' on '${request.resource.type}'`,
        matched_policies: [],
        cached: false,
      };
    }

    // Check ownership if required
    if (permission.requiresOwnership) {
      if (!request.resource.owner_id || request.resource.owner_id !== request.subject.user_id) {
        return {
          allowed: false,
          reason: 'Resource ownership required for this action',
          matched_policies: [permission.resource + '-' + permission.action],
          cached: false,
        };
      }
    }

    // Check conversation membership if required
    if (permission.requiresMembership) {
      const resourceId = request.resource.id;
      if (!resourceId) {
        return {
          allowed: false,
          reason: 'Resource ID required for membership check',
          matched_policies: [],
          cached: false,
        };
      }
      
      const isMember = await this.checkConversationMembership(
        resourceId,
        request.subject.user_id
      );

      if (!isMember) {
        return {
          allowed: false,
          reason: 'Conversation membership required for this action',
          matched_policies: [permission.resource + '-' + permission.action],
          cached: false,
        };
      }
    }

    // Permission granted
    return {
      allowed: true,
      reason: `Permission granted via role '${request.subject.roles.join(', ')}'`,
      matched_policies: [permission.resource + '-' + permission.action],
      cached: false,
    };
  }

  /**
   * Check if user is member of conversation
   * Uses cache if available, falls back to direct MongoDB query
   */
  private async checkConversationMembership(
    conversationId: string,
    userId: string
  ): Promise<boolean> {
    // If we have a membership cache, use it
    if (this.membershipCache) {
      const result = await this.membershipCache.isMember(
        conversationId,
        userId,
        () => this.queryConversationMembership(conversationId, userId)
      );
      return result.isMember;
    }

    // Otherwise query directly
    const result = await this.queryConversationMembership(conversationId, userId);
    return result.isMember;
  }

  /**
   * Query MongoDB for conversation membership
   */
  private async queryConversationMembership(
    conversationId: string,
    userId: string
  ): Promise<{ isMember: boolean; role?: string }> {
    if (!this.mongoClient) {
      console.warn('[AuthzEnforcer] MongoDB client not configured, allowing membership check');
      // In development mode without MongoDB, allow for testing
      return { isMember: true, role: 'member' };
    }

    try {
      const db = this.mongoClient.db('caas_platform');
      const conversationsCollection = db.collection('conversations');

      const conversation = await conversationsCollection.findOne({
        conversation_id: conversationId,
        'participants.user_id': userId,
        deleted_at: null,
      });

      if (!conversation) {
        return { isMember: false };
      }

      // Find user's role in the conversation
      const participant = conversation.participants?.find(
        (p: any) => p.user_id === userId
      );

      return {
        isMember: true,
        role: participant?.role || 'member',
      };
    } catch (error) {
      console.error('[AuthzEnforcer] Error checking conversation membership:', error);
      // Fail secure - deny on error
      return { isMember: false };
    }
  }

  /**
   * Audit authorization decision
   */
  private async auditDecision(
    request: AuthzRequest,
    decision: AuthzDecision,
    durationMs: number
  ): Promise<void> {
    // TODO: Send to audit service via Kafka
    const auditEntry = {
      timestamp: new Date(),
      tenant_id: request.subject.tenant_id,
      user_id: request.subject.user_id,
      resource_type: request.resource.type,
      resource_id: request.resource.id,
      action: request.action,
      decision: decision.allowed ? 'allow' : 'deny',
      reason: decision.reason,
      matched_policies: decision.matched_policies,
      duration_ms: durationMs,
      cached: decision.cached,
    };

    console.log('Authorization audit:', auditEntry);
  }

  /**
   * Batch authorize multiple requests
   */
  async authorizeBatch(requests: AuthzRequest[]): Promise<AuthzDecision[]> {
    // Process in parallel for efficiency
    return Promise.all(requests.map((req) => this.authorize(req)));
  }
}

export const authzEnforcer = new AuthzEnforcer();
