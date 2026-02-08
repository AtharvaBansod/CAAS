/**
 * Policy Parser
 * Phase 2 - Authorization - Task AUTHZ-001
 * 
 * Parses and validates policy definitions
 */

import { Policy, ValidationResult } from './types';

export class PolicyParser {
  /**
   * Parse policy from JSON
   */
  parse(policyJson: string): Policy {
    try {
      const policy = JSON.parse(policyJson);
      return this.normalize(policy);
    } catch (error) {
      throw new Error(`Failed to parse policy: ${error}`);
    }
  }

  /**
   * Normalize policy structure
   */
  private normalize(policy: any): Policy {
    return {
      id: policy.id || this.generateId(),
      name: policy.name || 'Unnamed Policy',
      description: policy.description || '',
      effect: policy.effect || 'deny',
      priority: policy.priority || 0,
      conditions: policy.conditions || [],
      target: {
        subjects: policy.target?.subjects || [],
        resources: policy.target?.resources || [],
        actions: policy.target?.actions || [],
        environment: policy.target?.environment,
      },
      metadata: policy.metadata,
    };
  }

  /**
   * Validate policy structure
   */
  validate(policy: Policy): ValidationResult {
    const errors: string[] = [];

    // Validate required fields
    if (!policy.id) {
      errors.push('Policy ID is required');
    }

    if (!policy.name) {
      errors.push('Policy name is required');
    }

    if (!['allow', 'deny'].includes(policy.effect)) {
      errors.push('Policy effect must be "allow" or "deny"');
    }

    // Validate priority
    if (typeof policy.priority !== 'number') {
      errors.push('Policy priority must be a number');
    }

    // Validate target
    if (!policy.target) {
      errors.push('Policy target is required');
    } else {
      if (!Array.isArray(policy.target.subjects)) {
        errors.push('Target subjects must be an array');
      }

      if (!Array.isArray(policy.target.resources)) {
        errors.push('Target resources must be an array');
      }

      if (!Array.isArray(policy.target.actions)) {
        errors.push('Target actions must be an array');
      }
    }

    // Validate conditions
    if (!Array.isArray(policy.conditions)) {
      errors.push('Policy conditions must be an array');
    } else {
      policy.conditions.forEach((condition, index) => {
        const conditionErrors = this.validateCondition(condition);
        errors.push(...conditionErrors.map(e => `Condition ${index}: ${e}`));
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate condition structure
   */
  private validateCondition(condition: any): string[] {
    const errors: string[] = [];

    if (!condition.type) {
      errors.push('Condition type is required');
    }

    if (condition.type === 'compound') {
      if (!['and', 'or', 'not'].includes(condition.operator)) {
        errors.push('Compound condition operator must be "and", "or", or "not"');
      }

      if (!Array.isArray(condition.conditions)) {
        errors.push('Compound condition must have conditions array');
      }
    } else if (condition.type === 'simple') {
      if (!condition.attribute) {
        errors.push('Simple condition must have attribute');
      }

      if (!condition.operator) {
        errors.push('Simple condition must have operator');
      }
    }

    return errors;
  }

  /**
   * Generate unique policy ID
   */
  private generateId(): string {
    return `policy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Compile policy for efficient evaluation
   */
  compile(policy: Policy): Policy {
    // Pre-compile regex patterns, optimize conditions, etc.
    // For now, return as-is
    return policy;
  }
}
