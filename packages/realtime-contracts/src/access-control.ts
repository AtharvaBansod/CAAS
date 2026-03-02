/**
 * RT-EVT-003: Explicit Access Control Matrix For Socket Events
 *
 * Provides runtime-enforceable access-control rules per event:
 *  - Role/permission matrix per event type
 *  - Cross-tenant denial
 *  - Cross-project denial for project-scoped events
 *  - Rate-limit profile mapping
 */

import {
  SOCKET_EVENT_REGISTRY,
  SocketAccessRole,
  SocketNamespace,
  RateLimitProfile,
  SocketEventRegistryEntry,
} from './index';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface AccessControlDecision {
  allowed: boolean;
  code: string;
  message: string;
  rate_limit_profile?: RateLimitProfile;
}

export interface AccessControlContext {
  namespace: SocketNamespace;
  event: string;
  /** Role of the caller in the current scope (room, conversation, or tenant). */
  callerRole: SocketAccessRole;
  /** Permissions carried by the caller's JWT or session. */
  callerPermissions: string[];
  /** Tenant ID the caller belongs to. */
  callerTenantId: string;
  /** Project ID the caller belongs to (from session / JWT). */
  callerProjectId?: string;
  /** Tenant ID of the target resource (for cross-tenant checks). */
  resourceTenantId: string;
  /** Project ID of the target resource (for project-scoped checks). */
  resourceProjectId?: string;
}

/* ------------------------------------------------------------------ */
/* Rate-limit windows per profile (requests per window-ms)            */
/* ------------------------------------------------------------------ */

export interface RateLimitSpec {
  maxRequests: number;
  windowMs: number;
}

export const RATE_LIMIT_SPECS: Record<RateLimitProfile, RateLimitSpec> = {
  none: { maxRequests: Infinity, windowMs: 60_000 },
  low: { maxRequests: 10, windowMs: 60_000 },
  medium: { maxRequests: 60, windowMs: 60_000 },
  high: { maxRequests: 200, windowMs: 60_000 },
  critical: { maxRequests: 500, windowMs: 60_000 },
};

/* ------------------------------------------------------------------ */
/* Enforcement helpers                                                 */
/* ------------------------------------------------------------------ */

/**
 * Look up registry entry. Returns null if not found (unknown event).
 */
function lookupEntry(
  namespace: SocketNamespace,
  event: string,
): SocketEventRegistryEntry | null {
  const key = `${namespace}:${event}`;
  return SOCKET_EVENT_REGISTRY[key] ?? null;
}

/**
 * Evaluate whether a caller is allowed to invoke a socket event.
 * Pure function — no side effects, no I/O.
 */
export function evaluateAccessControl(ctx: AccessControlContext): AccessControlDecision {
  const entry = lookupEntry(ctx.namespace, ctx.event);

  /* Unknown / unregistered event —→ deny */
  if (!entry) {
    return {
      allowed: false,
      code: 'UNKNOWN_EVENT',
      message: `Event ${ctx.namespace}:${ctx.event} is not registered in the event catalog`,
    };
  }

  /* Deprecated event —→ deny */
  if (entry.lifecycle === 'deprecated') {
    return {
      allowed: false,
      code: 'EVENT_DEPRECATED',
      message: `Event ${ctx.namespace}:${ctx.event} is deprecated and no longer available`,
    };
  }

  /* Planned (not yet released) event —→ deny */
  if (entry.lifecycle === 'planned') {
    return {
      allowed: false,
      code: 'EVENT_NOT_AVAILABLE',
      message: `Event ${ctx.namespace}:${ctx.event} is not yet available`,
    };
  }

  /* Cross-tenant denial */
  if (ctx.callerTenantId !== ctx.resourceTenantId) {
    return {
      allowed: false,
      code: 'CROSS_TENANT_DENIED',
      message: 'Cross-tenant event execution is not permitted',
    };
  }

  /* Cross-project denial for project-scoped events */
  if (
    entry.projectScoped &&
    ctx.resourceProjectId &&
    ctx.callerProjectId &&
    ctx.callerProjectId !== ctx.resourceProjectId
  ) {
    return {
      allowed: false,
      code: 'CROSS_PROJECT_DENIED',
      message: 'Cross-project event execution is not permitted for project-scoped events',
    };
  }

  /* Role check */
  if (!entry.accessRoles.includes(ctx.callerRole)) {
    return {
      allowed: false,
      code: 'ROLE_DENIED',
      message: `Role '${ctx.callerRole}' is not authorized for event ${ctx.namespace}:${ctx.event}`,
    };
  }

  /* Permission check — caller must hold ALL required permissions */
  const missingPerms = entry.permissions.filter(
    (p) => !ctx.callerPermissions.includes(p),
  );
  if (missingPerms.length > 0) {
    return {
      allowed: false,
      code: 'PERMISSION_DENIED',
      message: `Missing required permissions: ${missingPerms.join(', ')}`,
    };
  }

  /* ---- Allowed ---- */
  return {
    allowed: true,
    code: 'OK',
    message: 'Access granted',
    rate_limit_profile: entry.rateLimitProfile,
  };
}

/**
 * Get the rate-limit spec for a given event, from the registry profile.
 */
export function getRateLimitForEvent(
  namespace: SocketNamespace,
  event: string,
): RateLimitSpec {
  const entry = lookupEntry(namespace, event);
  const profile = entry?.rateLimitProfile ?? 'medium';
  return RATE_LIMIT_SPECS[profile];
}

/**
 * Bulk query: return all events a given role+permissions combination can access.
 */
export function getAccessibleEvents(
  role: SocketAccessRole,
  permissions: string[],
): Array<{ namespace: SocketNamespace; event: string; rateLimitProfile: RateLimitProfile }> {
  const result: Array<{
    namespace: SocketNamespace;
    event: string;
    rateLimitProfile: RateLimitProfile;
  }> = [];
  for (const entry of Object.values(SOCKET_EVENT_REGISTRY)) {
    if (entry.lifecycle !== 'active') continue;
    if (!entry.accessRoles.includes(role)) continue;
    const missing = entry.permissions.filter((p) => !permissions.includes(p));
    if (missing.length > 0) continue;
    result.push({
      namespace: entry.namespace,
      event: entry.event,
      rateLimitProfile: entry.rateLimitProfile,
    });
  }
  return result;
}

/**
 * Export the full access-control matrix as a plain JSON-serializable object.
 * Useful for documentation / governance tooling.
 */
export function exportAccessControlMatrix(): Array<{
  eventId: string;
  namespace: SocketNamespace;
  event: string;
  lifecycle: string;
  projectScoped: boolean;
  accessRoles: SocketAccessRole[];
  permissions: string[];
  rateLimitProfile: RateLimitProfile;
  rateLimitSpec: RateLimitSpec;
}> {
  return Object.values(SOCKET_EVENT_REGISTRY).map((entry) => ({
    eventId: entry.eventId,
    namespace: entry.namespace,
    event: entry.event,
    lifecycle: entry.lifecycle,
    projectScoped: entry.projectScoped,
    accessRoles: [...entry.accessRoles],
    permissions: [...entry.permissions],
    rateLimitProfile: entry.rateLimitProfile,
    rateLimitSpec: RATE_LIMIT_SPECS[entry.rateLimitProfile],
  }));
}
