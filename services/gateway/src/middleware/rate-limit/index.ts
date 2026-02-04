import { FastifyRequest, FastifyReply } from 'fastify';
import { rateLimitStore } from './rate-limit-store';
import { getRateLimitKey } from './rate-limit-key';
import { RATE_LIMIT_TIERS, DEFAULT_TIER } from './tiers';
import { quotaService } from '../../services/quota-service';
import { TooManyRequestsError } from '../../errors';

export const rateLimitMiddleware = async (request: FastifyRequest, reply: FastifyReply) => {
  const key = getRateLimitKey(request);
  const auth = (request as any).auth;
  const tenant = request.tenant;

  // Determine limit and window
  let limit: number;
  let window: number;
  let quotaLimit = -1; // -1 means unlimited

  if (tenant && tenant.limits?.api_rate_limit) {
    // Use tenant specific limits if available
    limit = tenant.limits.api_rate_limit;
    window = 60; // Default window for tenant limits (can be configurable)
    quotaLimit = tenant.limits.monthly_quota || -1;
  } else {
    // Fallback to Tier based
    const tierName = tenant?.plan || auth?.rate_limit_tier || DEFAULT_TIER;
    const tier = RATE_LIMIT_TIERS[tierName] || RATE_LIMIT_TIERS[DEFAULT_TIER];
    limit = tier.requests;
    window = tier.window;
    // Assuming tiers might have quotas in the future, or default to unlimited for now
    // quotaLimit = tier.quota || -1; 
  }

  // 1. Check Monthly Quota (if applicable)
  if (tenant?.tenant_id && quotaLimit >= 0) {
    const hasQuota = await quotaService.checkQuota(tenant.tenant_id, quotaLimit);
    if (!hasQuota) {
      throw new TooManyRequestsError('Monthly API quota exceeded');
    }
  }

  try {
    // 2. Check Rate Limit (Sliding/Fixed Window)
    const { current, ttl } = await rateLimitStore.increment(key, window);

    reply.header('X-RateLimit-Limit', limit);
    reply.header('X-RateLimit-Remaining', Math.max(0, limit - current));
    reply.header('X-RateLimit-Reset', Math.floor(Date.now() / 1000) + ttl);

    if (current > limit) {
      throw new TooManyRequestsError(`Rate limit exceeded. Try again in ${ttl} seconds.`);
    }
    
    // 3. Increment Quota Usage (only if request is successful/allowed)
    // Note: Ideally we increment after response is sent, but for simplicity we do it here.
    // Or we could do it in an onResponse hook.
    if (tenant?.tenant_id) {
       // Fire and forget to not block response
       quotaService.incrementUsage(tenant.tenant_id).catch(err => {
         request.log.error({ err, tenantId: tenant.tenant_id }, 'Failed to increment quota');
       });
    }

  } catch (err) {
    if (err instanceof TooManyRequestsError) {
      throw err;
    }
    // Fail open if Redis is down? Or log and continue?
    request.log.error(err, 'Rate limit error');
  }
};
