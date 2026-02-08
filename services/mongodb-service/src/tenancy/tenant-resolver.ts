import { Request } from 'express';

export class TenantResolver {
  static resolveFromRequest(req: Request): string | undefined {
    // 1. Check header
    const headerTenant = req.headers['x-tenant-id'];
    if (typeof headerTenant === 'string') return headerTenant;

    // 2. Check query param
    const queryTenant = req.query['tenantId'];
    if (typeof queryTenant === 'string') return queryTenant;

    // 3. Check path param (simplified)
    if (req.params && req.params.tenantId) return req.params.tenantId;

    // 4. JWT check would go here (need to decode token)
    
    return undefined;
  }
}
