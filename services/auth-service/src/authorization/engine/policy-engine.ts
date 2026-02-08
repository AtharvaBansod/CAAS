/**
 * ABAC Policy Engine
 * Phase 2 - Authorization - Task AUTHZ-001
 * 
 * Core policy engine for evaluating access requests
 */

import { Policy, AccessRequest, PolicyDecision, ValidationResult, CombiningAlgorithm } from './types';
import { PolicyParser } from './policy-parser';
import { ConditionEvaluator } from './condition-evaluator';
import { TargetMatcher } from './target-matcher';
import { DecisionCombiner } from './decision';

export class PolicyEngine {
  private policies: Map<string, Policy> = new Map();
  private parser: PolicyParser;
  private conditionEvaluator: ConditionEvaluator;
  private targetMatcher: TargetMatcher;
  private decisionCombiner: DecisionCombiner;

  constructor(combiningAlgorithm: CombiningAlgorithm = 'deny-overrides') {
    this.parser = new PolicyParser();
    this.conditionEvaluator = new ConditionEvaluator();
    this.targetMatcher = new TargetMatcher();
    this.decisionCombiner = new DecisionCombiner(combiningAlgorithm);
  }

  /**
   * Load policies into engine
   */
  loadPolicies(policies: Policy[]): void {
    for (const policy of policies) {
      const validation = this.validatePolicy(policy);
      if (!validation.valid) {
        console.error(`Invalid policy ${policy.id}:`, validation.errors);
        continue;
      }

      const compiled = this.parser.compile(policy);
      this.policies.set(policy.id, compiled);
    }

    console.log(`Loaded ${this.policies.size} policies`);
  }

  /**
   * Evaluate access request against policies
   */
  async evaluate(request: AccessRequest): Promise<PolicyDecision> {
    const startTime = Date.now();

    // Get applicable policies
    const applicablePolicies = this.getApplicablePolicies(request);

    if (applicablePolicies.length === 0) {
      return {
        effect: 'deny',
        reason: 'No applicable policies found',
        matched_policies: [],
        evaluation_time_ms: Date.now() - startTime,
        cached: false,
      };
    }

    // Evaluate each policy
    const evaluatedPolicies = applicablePolicies.map(policy => ({
      policy,
      matches: this.evaluatePolicy(policy, request),
    }));

    // Combine decisions
    const decision = this.decisionCombiner.combine(
      evaluatedPolicies,
      Date.now() - startTime
    );

    return decision;
  }

  /**
   * Get policies applicable to resource
   */
  getPoliciesForResource(resourceType: string): Policy[] {
    const policies: Policy[] = [];

    for (const policy of this.policies.values()) {
      const hasResourceMatch = policy.target.resources.some(
        matcher => matcher.type === 'type' && matcher.value === resourceType
      );

      if (hasResourceMatch || policy.target.resources.length === 0) {
        policies.push(policy);
      }
    }

    return policies;
  }

  /**
   * Validate policy
   */
  validatePolicy(policy: Policy): ValidationResult {
    return this.parser.validate(policy);
  }

  /**
   * Get all loaded policies
   */
  getAllPolicies(): Policy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get policy by ID
   */
  getPolicy(id: string): Policy | undefined {
    return this.policies.get(id);
  }

  /**
   * Remove policy
   */
  removePolicy(id: string): boolean {
    return this.policies.delete(id);
  }

  /**
   * Clear all policies
   */
  clearPolicies(): void {
    this.policies.clear();
  }

  /**
   * Get applicable policies for request
   */
  private getApplicablePolicies(request: AccessRequest): Policy[] {
    const applicable: Policy[] = [];

    for (const policy of this.policies.values()) {
      if (this.targetMatcher.matches(policy.target, request)) {
        applicable.push(policy);
      }
    }

    // Sort by priority (higher first)
    return applicable.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Evaluate single policy
   */
  private evaluatePolicy(policy: Policy, request: AccessRequest): boolean {
    // If no conditions, policy matches
    if (policy.conditions.length === 0) {
      return true;
    }

    // All conditions must be true
    return policy.conditions.every(condition =>
      this.conditionEvaluator.evaluate(condition, request)
    );
  }

  /**
   * Get engine statistics
   */
  getStats(): {
    totalPolicies: number;
    policiesByEffect: Record<string, number>;
    averagePriority: number;
  } {
    const policies = Array.from(this.policies.values());
    const policiesByEffect: Record<string, number> = {};

    for (const policy of policies) {
      policiesByEffect[policy.effect] = (policiesByEffect[policy.effect] || 0) + 1;
    }

    const averagePriority = policies.length > 0
      ? policies.reduce((sum, p) => sum + p.priority, 0) / policies.length
      : 0;

    return {
      totalPolicies: policies.length,
      policiesByEffect,
      averagePriority,
    };
  }
}
