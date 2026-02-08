/**
 * ABAC Policy Engine Types
 * Phase 2 - Authorization - Task AUTHZ-001
 */

export type PolicyEffect = 'allow' | 'deny';
export type CombiningAlgorithm = 'deny-overrides' | 'allow-overrides' | 'first-applicable';

export interface Policy {
  id: string;
  name: string;
  description: string;
  effect: PolicyEffect;
  priority: number;
  conditions: Condition[];
  target: PolicyTarget;
  metadata?: {
    created_at?: Date;
    updated_at?: Date;
    created_by?: string;
  };
}

export interface PolicyTarget {
  subjects: SubjectMatcher[];
  resources: ResourceMatcher[];
  actions: ActionMatcher[];
  environment?: EnvironmentMatcher[];
}

export interface SubjectMatcher {
  type: 'user' | 'role' | 'attribute';
  operator: MatchOperator;
  value: unknown;
  attribute?: string;
}

export interface ResourceMatcher {
  type: 'type' | 'id' | 'attribute' | 'owner';
  operator: MatchOperator;
  value: unknown;
  attribute?: string;
}

export interface ActionMatcher {
  operator: MatchOperator;
  value: string | string[];
}

export interface EnvironmentMatcher {
  attribute: string;
  operator: MatchOperator;
  value: unknown;
}

export type MatchOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'matches'
  | 'in'
  | 'not_in';

export interface Condition {
  type: 'simple' | 'compound';
  operator?: ConditionOperator;
  attribute?: string;
  value?: unknown;
  conditions?: Condition[];
}

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'matches'
  | 'in'
  | 'not_in'
  | 'and'
  | 'or'
  | 'not';

export interface AccessRequest {
  subject: Subject;
  resource: Resource;
  action: string;
  environment: Environment;
}

export interface Subject {
  user_id: string;
  tenant_id: string;
  roles: string[];
  attributes: Record<string, unknown>;
}

export interface Resource {
  type: string;
  id: string;
  tenant_id: string;
  owner_id?: string;
  attributes: Record<string, unknown>;
}

export interface Environment {
  ip_address: string;
  time: Date;
  device_type: string;
  [key: string]: unknown;
}

export interface PolicyDecision {
  effect: PolicyEffect;
  reason: string;
  matched_policies: string[];
  evaluation_time_ms: number;
  cached: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface EvaluationContext {
  request: AccessRequest;
  policies: Policy[];
  start_time: number;
}
