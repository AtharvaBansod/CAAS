/**
 * Policy Decision Logic
 * Phase 2 - Authorization - Task AUTHZ-001
 * 
 * Combines multiple policy evaluations into final decision
 */

import { Policy, PolicyDecision, PolicyEffect, CombiningAlgorithm } from './types';

export class DecisionCombiner {
  constructor(private algorithm: CombiningAlgorithm = 'deny-overrides') {}

  /**
   * Combine multiple policy evaluations into final decision
   */
  combine(
    evaluatedPolicies: Array<{ policy: Policy; matches: boolean }>,
    evaluationTimeMs: number
  ): PolicyDecision {
    const matchedPolicies = evaluatedPolicies
      .filter(ep => ep.matches)
      .map(ep => ep.policy)
      .sort((a, b) => b.priority - a.priority); // Higher priority first

    if (matchedPolicies.length === 0) {
      return {
        effect: 'deny',
        reason: 'No applicable policies found',
        matched_policies: [],
        evaluation_time_ms: evaluationTimeMs,
        cached: false,
      };
    }

    switch (this.algorithm) {
      case 'deny-overrides':
        return this.denyOverrides(matchedPolicies, evaluationTimeMs);

      case 'allow-overrides':
        return this.allowOverrides(matchedPolicies, evaluationTimeMs);

      case 'first-applicable':
        return this.firstApplicable(matchedPolicies, evaluationTimeMs);

      default:
        return this.denyOverrides(matchedPolicies, evaluationTimeMs);
    }
  }

  /**
   * Deny-overrides: Any deny wins
   */
  private denyOverrides(policies: Policy[], evaluationTimeMs: number): PolicyDecision {
    // Check for any deny
    const denyPolicy = policies.find(p => p.effect === 'deny');
    if (denyPolicy) {
      return {
        effect: 'deny',
        reason: `Denied by policy: ${denyPolicy.name}`,
        matched_policies: [denyPolicy.id],
        evaluation_time_ms: evaluationTimeMs,
        cached: false,
      };
    }

    // All are allow
    const allowPolicy = policies[0];
    return {
      effect: 'allow',
      reason: `Allowed by policy: ${allowPolicy.name}`,
      matched_policies: policies.map(p => p.id),
      evaluation_time_ms: evaluationTimeMs,
      cached: false,
    };
  }

  /**
   * Allow-overrides: Any allow wins
   */
  private allowOverrides(policies: Policy[], evaluationTimeMs: number): PolicyDecision {
    // Check for any allow
    const allowPolicy = policies.find(p => p.effect === 'allow');
    if (allowPolicy) {
      return {
        effect: 'allow',
        reason: `Allowed by policy: ${allowPolicy.name}`,
        matched_policies: [allowPolicy.id],
        evaluation_time_ms: evaluationTimeMs,
        cached: false,
      };
    }

    // All are deny
    const denyPolicy = policies[0];
    return {
      effect: 'deny',
      reason: `Denied by policy: ${denyPolicy.name}`,
      matched_policies: policies.map(p => p.id),
      evaluation_time_ms: evaluationTimeMs,
      cached: false,
    };
  }

  /**
   * First-applicable: First matching policy wins
   */
  private firstApplicable(policies: Policy[], evaluationTimeMs: number): PolicyDecision {
    const firstPolicy = policies[0];

    return {
      effect: firstPolicy.effect,
      reason: `${firstPolicy.effect === 'allow' ? 'Allowed' : 'Denied'} by policy: ${firstPolicy.name}`,
      matched_policies: [firstPolicy.id],
      evaluation_time_ms: evaluationTimeMs,
      cached: false,
    };
  }

  /**
   * Get combining algorithm
   */
  getAlgorithm(): CombiningAlgorithm {
    return this.algorithm;
  }

  /**
   * Set combining algorithm
   */
  setAlgorithm(algorithm: CombiningAlgorithm): void {
    this.algorithm = algorithm;
  }
}
