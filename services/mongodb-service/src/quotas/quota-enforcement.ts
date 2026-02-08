import { Request, Response, NextFunction } from 'express';
import { QuotaManager, Resource } from './quota-manager';
import { TenantResolver } from '../tenancy/tenant-resolver';

export const quotaMiddleware = (resource: Resource, quantity: number = 1) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const tenantId = TenantResolver.resolveFromRequest(req);
    
    if (!tenantId) {
      // If no tenant context, maybe skip quota or block?
      // For now, proceed (e.g., public endpoints)
      return next();
    }

    const allowed = await QuotaManager.getInstance().checkQuota(tenantId, resource, quantity);
    
    if (!allowed) {
      return res.status(429).json({
        error: 'Quota Exceeded',
        message: `You have exceeded your limit for ${resource}`
      });
    }

    // Increment usage asynchronously (fire and forget for latency)
    QuotaManager.getInstance().incrementUsage(tenantId, resource, quantity).catch(console.error);

    next();
  };
};
