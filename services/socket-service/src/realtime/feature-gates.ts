import { createHash } from 'crypto';
import { SocketNamespace } from '@caas/realtime-contracts';
import { config } from '../config';

interface RealtimeGateParams {
  namespace: SocketNamespace;
  event: string;
  tenantId?: string;
  userId?: string;
}

interface RealtimeGateResult {
  allowed: boolean;
  code?: string;
  message?: string;
  rollout_policy?: string;
}

type SocketResponder = (response: Record<string, unknown>) => void;

function parseList(raw: string): Set<string> {
  return new Set(
    raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

function matchesRule(rules: Set<string>, namespace: SocketNamespace, event: string): boolean {
  const fullEvent = `${namespace}:${event}`;
  return (
    rules.has('*') ||
    rules.has(namespace) ||
    rules.has(`${namespace}:*`) ||
    rules.has(fullEvent)
  );
}

function getCanaryBucket(value: string): number {
  const digest = createHash('sha256').update(value).digest('hex');
  return Number.parseInt(digest.slice(0, 8), 16) % 100;
}

export function evaluateRealtimeEventGate(params: RealtimeGateParams): RealtimeGateResult {
  const disabledNamespaces = parseList(config.realtime.disabledNamespaces);
  const disabledEvents = parseList(config.realtime.disabledEvents);
  const canaryEvents = parseList(config.realtime.canaryEvents);
  const canaryPercent = Math.min(Math.max(config.realtime.canaryPercent, 0), 100);

  if (matchesRule(disabledNamespaces, params.namespace, params.event)) {
    return {
      allowed: false,
      code: 'FEATURE_DISABLED',
      message: `Realtime namespace ${params.namespace} is temporarily disabled`,
      rollout_policy: 'namespace-disabled',
    };
  }

  if (matchesRule(disabledEvents, params.namespace, params.event)) {
    return {
      allowed: false,
      code: 'FEATURE_DISABLED',
      message: `Realtime event ${params.namespace}:${params.event} is temporarily disabled`,
      rollout_policy: 'event-disabled',
    };
  }

  if (matchesRule(canaryEvents, params.namespace, params.event)) {
    if (canaryPercent <= 0) {
      return {
        allowed: false,
        code: 'CANARY_DISABLED',
        message: `Realtime event ${params.namespace}:${params.event} is not enabled for this rollout window`,
        rollout_policy: 'canary-percent-0',
      };
    }

    if (canaryPercent < 100) {
      const bucketSource = `${params.tenantId || 'anonymous'}:${params.userId || 'anonymous'}:${params.namespace}:${params.event}`;
      const bucket = getCanaryBucket(bucketSource);
      if (bucket >= canaryPercent) {
        return {
          allowed: false,
          code: 'CANARY_DISABLED',
          message: `Realtime event ${params.namespace}:${params.event} is not enabled for this rollout window`,
          rollout_policy: `canary-${canaryPercent}`,
        };
      }
    }
  }

  return { allowed: true };
}

export function enforceRealtimeEventGate(
  params: RealtimeGateParams,
  respond: SocketResponder
): boolean {
  const decision = evaluateRealtimeEventGate(params);
  if (decision.allowed) {
    return true;
  }

  respond({
    status: 'error',
    code: decision.code,
    message: decision.message,
    rollout_policy: decision.rollout_policy,
  });
  return false;
}
