/**
 * Write Concern Configuration
 * 
 * Optimized write concerns for different use cases
 */

import { WriteConcern } from 'mongodb';

/**
 * Write concern presets
 */
export const WriteConcernPresets = {
  /**
   * FAST - Optimized for high throughput
   * w=1, j=false
   * Acknowledges write to primary only, no journal sync
   * Use for: High-volume, non-critical data
   */
  FAST: {
    w: 1,
    j: false,
    wtimeout: 5000,
  } as WriteConcern,

  /**
   * SAFE - Optimized for data safety
   * w=majority, j=true
   * Acknowledges write to majority of replica set with journal sync
   * Use for: Critical data, financial transactions
   */
  SAFE: {
    w: 'majority',
    j: true,
    wtimeout: 10000,
  } as WriteConcern,

  /**
   * BALANCED - Default balanced approach
   * w=1, j=true
   * Acknowledges write to primary with journal sync
   * Use for: Most application data
   */
  BALANCED: {
    w: 1,
    j: true,
    wtimeout: 5000,
  } as WriteConcern,

  /**
   * EVENTUAL - Fire and forget
   * w=0
   * No acknowledgment
   * Use for: Logging, analytics (use with caution)
   */
  EVENTUAL: {
    w: 0,
    wtimeout: 0,
  } as WriteConcern,
};

/**
 * Get write concern by name
 */
export function getWriteConcern(
  preset: keyof typeof WriteConcernPresets
): WriteConcern {
  return WriteConcernPresets[preset];
}

/**
 * Create custom write concern
 */
export function createWriteConcern(options: {
  w?: number | 'majority';
  j?: boolean;
  wtimeout?: number;
}): WriteConcern {
  return {
    w: options.w || 1,
    j: options.j !== false,
    wtimeout: options.wtimeout || 5000,
  };
}

/**
 * Get recommended write concern for operation type
 */
export function getRecommendedWriteConcern(
  operationType: 'message' | 'conversation' | 'user' | 'transaction' | 'analytics'
): WriteConcern {
  switch (operationType) {
    case 'message':
      return WriteConcernPresets.BALANCED;
    case 'conversation':
      return WriteConcernPresets.BALANCED;
    case 'user':
      return WriteConcernPresets.SAFE;
    case 'transaction':
      return WriteConcernPresets.SAFE;
    case 'analytics':
      return WriteConcernPresets.FAST;
    default:
      return WriteConcernPresets.BALANCED;
  }
}
