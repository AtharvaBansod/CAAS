/**
 * Cache Metrics
 * Track cache performance metrics
 */

export interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  avgLookupTime: number;
}

export class CacheMetricsCollector {
  private metrics: Map<string, CacheMetrics> = new Map();
  private lookupTimes: Map<string, number[]> = new Map();

  /**
   * Record cache hit
   */
  recordHit(cacheType: string): void {
    const metrics = this.getOrCreateMetrics(cacheType);
    metrics.hits++;
  }

  /**
   * Record cache miss
   */
  recordMiss(cacheType: string): void {
    const metrics = this.getOrCreateMetrics(cacheType);
    metrics.misses++;
  }

  /**
   * Record cache eviction
   */
  recordEviction(cacheType: string): void {
    const metrics = this.getOrCreateMetrics(cacheType);
    metrics.evictions++;
  }

  /**
   * Update cache size
   */
  updateSize(cacheType: string, size: number): void {
    const metrics = this.getOrCreateMetrics(cacheType);
    metrics.size = size;
  }

  /**
   * Record lookup time
   */
  recordLookupTime(cacheType: string, timeMs: number): void {
    const times = this.lookupTimes.get(cacheType) || [];
    times.push(timeMs);
    
    // Keep only last 1000 measurements
    if (times.length > 1000) {
      times.shift();
    }
    
    this.lookupTimes.set(cacheType, times);
    
    // Update average
    const metrics = this.getOrCreateMetrics(cacheType);
    metrics.avgLookupTime = times.reduce((a, b) => a + b, 0) / times.length;
  }

  /**
   * Get metrics for a cache type
   */
  getMetrics(cacheType: string): CacheMetrics {
    return this.getOrCreateMetrics(cacheType);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Record<string, CacheMetrics> {
    const result: Record<string, CacheMetrics> = {};
    this.metrics.forEach((metrics, cacheType) => {
      result[cacheType] = { ...metrics };
    });
    return result;
  }

  /**
   * Calculate hit rate
   */
  getHitRate(cacheType: string): number {
    const metrics = this.getOrCreateMetrics(cacheType);
    const total = metrics.hits + metrics.misses;
    return total > 0 ? metrics.hits / total : 0;
  }

  /**
   * Reset metrics
   */
  reset(cacheType?: string): void {
    if (cacheType) {
      this.metrics.delete(cacheType);
      this.lookupTimes.delete(cacheType);
    } else {
      this.metrics.clear();
      this.lookupTimes.clear();
    }
  }

  /**
   * Export metrics for Prometheus
   */
  exportPrometheusMetrics(): string {
    let output = '';
    
    this.metrics.forEach((metrics, cacheType) => {
      const hitRate = this.getHitRate(cacheType);
      
      output += `# HELP authz_cache_hits_total Total number of cache hits\n`;
      output += `# TYPE authz_cache_hits_total counter\n`;
      output += `authz_cache_hits_total{cache="${cacheType}"} ${metrics.hits}\n\n`;
      
      output += `# HELP authz_cache_misses_total Total number of cache misses\n`;
      output += `# TYPE authz_cache_misses_total counter\n`;
      output += `authz_cache_misses_total{cache="${cacheType}"} ${metrics.misses}\n\n`;
      
      output += `# HELP authz_cache_hit_rate Cache hit rate (0-1)\n`;
      output += `# TYPE authz_cache_hit_rate gauge\n`;
      output += `authz_cache_hit_rate{cache="${cacheType}"} ${hitRate.toFixed(4)}\n\n`;
      
      output += `# HELP authz_cache_size Current cache size\n`;
      output += `# TYPE authz_cache_size gauge\n`;
      output += `authz_cache_size{cache="${cacheType}"} ${metrics.size}\n\n`;
      
      output += `# HELP authz_cache_avg_lookup_time_ms Average lookup time in milliseconds\n`;
      output += `# TYPE authz_cache_avg_lookup_time_ms gauge\n`;
      output += `authz_cache_avg_lookup_time_ms{cache="${cacheType}"} ${metrics.avgLookupTime.toFixed(2)}\n\n`;
    });
    
    return output;
  }

  private getOrCreateMetrics(cacheType: string): CacheMetrics {
    if (!this.metrics.has(cacheType)) {
      this.metrics.set(cacheType, {
        hits: 0,
        misses: 0,
        evictions: 0,
        size: 0,
        avgLookupTime: 0,
      });
    }
    return this.metrics.get(cacheType)!;
  }
}

// Global metrics collector instance
export const cacheMetrics = new CacheMetricsCollector();
