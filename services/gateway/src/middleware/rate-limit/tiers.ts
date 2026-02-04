export interface RateLimitTier {
  requests: number;
  window: number; // in seconds
  burst: number;
}

export const RATE_LIMIT_TIERS: Record<string, RateLimitTier> = {
  free: { requests: 100, window: 60, burst: 20 },
  startup: { requests: 1000, window: 60, burst: 100 },
  business: { requests: 10000, window: 60, burst: 500 },
  enterprise: { requests: 100000, window: 60, burst: 5000 },
};

export const DEFAULT_TIER = 'free';
