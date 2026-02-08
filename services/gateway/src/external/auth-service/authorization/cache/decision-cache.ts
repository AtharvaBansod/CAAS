/**
 * Authorization Decision Cache
 * 
 * Multi-level caching for authorization decisions
 */

import { PolicyDecision } from '../engine/types';
import { CacheKeyComponents, CachedDecision, CacheStats } from './types';
import { LRUCache } from './lru-cache';

export class DecisionCache {
  private l1Cache: LRUCache<CachedDecision>; // In-memory
  private l2Cache: any; // Redis (injected)
  private stats: CacheStats;
  private defaultTTL: number;

  constructor(
    l1MaxSize: number = 1000,
    defaultTTL: number = 60,
    redisClient?: any
  ) {
    this.l1Cache = new LRUCache<CachedDecision>(l1MaxSize);
    this.l2Cache = redisClient;
    this.defaultTTL = defaultTTL;
    this.stats = {
      hits: 0,
      misses: 0,
      hit_rate: 0,
      total_requests: 0,
      avg_lookup_time_ms: 0,
    };
  }

  /**
   * Get cached decision
   */
  async get(components: CacheKeyComponents): Promise<PolicyDecision | null> {
    const startTime = Date.now();
    this.stats.total_requests++;

    const key = this.generateKey(components);

    // Try L1 cache
    const l1Result = this.l1Cache.get(key);
    if (l1Result && !this.isExpired(l1Result)) {
      this.stats.hits++;
      this.updateStats(Date.now() - startTime);
      return l1Result.decision;
    }

    // Try L2 cache (Redis)
    if (this.l2Cache) {
      try {
        const l2Result = await this.l2Cache.get(key);
        if (l2Result) {
          const cached: CachedDecision = JSON.parse(l2Result);
          if (!this.isExpired(cached)) {
            // Promote to L1
            this.l1Cache.set(key, cached);
            this.stats.hits++;
            this.updateStats(Date.now() - startTime);
            return cached.decision;
          }
        }
      } catch (error) {
        console.error('L2 cache error:', error);
      }
    }

    this.stats.misses++;
    this.updateStats(Date.now() - startTime);
    return null;
  }

  /**
   * Set cached decision
   */
  async set(
    components: CacheKeyComponents,
    decision: PolicyDecision,
    ttl?: number
  ): Promise<void> {
    const key = this.generateKey(components);
    const cached: CachedDecision = {
      decision,
      cached_at: Date.now(),
      ttl: ttl || this.defaultTTL,
    };

    // Set in L1
    this.l1Cache.set(key, cached);

    // Set in L2 (Redis)
    if (this.l2Cache) {
      try {
        await this.l2Cache.setex(
          key,
          cached.ttl,
          JSON.stringify(cached)
        );
      } catch (error) {
        console.error('L2 cache set error:', error);
      }
    }
  }

  /**
   * Invalidate cache entries
   */
  async invalidate(pattern?: {
    tenantId?: string;
    userId?: string;
    resourceType?: string;
    resourceId?: string;
  }): Promise<void> {
    if (!pattern) {
      // Clear all
      this.l1Cache.clear();
      if (this.l2Cache) {
        // In production, use Redis SCAN with pattern
        console.warn('Full cache invalidation requested');
      }
      return;
    }

    // Build pattern key
    const patternKey = this.generatePatternKey(pattern);

    // Clear L1 matching entries
    this.l1Cache.clear(); // Simple approach: clear all

    // Clear L2 matching entries
    if (this.l2Cache) {
      try {
        const keys = await this.l2Cache.keys(`${patternKey}*`);
        if (keys.length > 0) {
          await this.l2Cache.del(...keys);
        }
      } catch (error) {
        console.error('L2 cache invalidation error:', error);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    this.stats.hit_rate = this.stats.total_requests > 0
      ? this.stats.hits / this.stats.total_requests
      : 0;
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      hit_rate: 0,
      total_requests: 0,
      avg_lookup_time_ms: 0,
    };
  }

  /**
   * Generate cache key
   */
  private generateKey(components: CacheKeyComponents): string {
    const { tenantId, userId, resourceType, resourceId, action } = components;
    return `authz:${tenantId}:${userId}:${resourceType}:${resourceId || '*'}:${action}`;
  }

  /**
   * Generate pattern key for invalidation
   */
  private generatePatternKey(pattern: {
    tenantId?: string;
    userId?: string;
    resourceType?: string;
    resourceId?: string;
  }): string {
    const parts = ['authz'];
    parts.push(pattern.tenantId || '*');
    parts.push(pattern.userId || '*');
    parts.push(pattern.resourceType || '*');
    parts.push(pattern.resourceId || '*');
    return parts.join(':');
  }

  /**
   * Check if cached entry is expired
   */
  private isExpired(cached: CachedDecision): boolean {
    const age = (Date.now() - cached.cached_at) / 1000; // seconds
    return age > cached.ttl;
  }

  /**
   * Update statistics
   */
  private updateStats(lookupTime: number): void {
    const totalTime = this.stats.avg_lookup_time_ms * (this.stats.total_requests - 1);
    this.stats.avg_lookup_time_ms = (totalTime + lookupTime) / this.stats.total_requests;
  }
}
