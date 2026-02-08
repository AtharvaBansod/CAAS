/**
 * Condition Evaluator
 * Phase 2 - Authorization - Task AUTHZ-001
 * 
 * Evaluates policy conditions against request context
 */

import { Condition, ConditionOperator, AccessRequest } from './types';

export class ConditionEvaluator {
  /**
   * Evaluate a condition
   */
  evaluate(condition: Condition, request: AccessRequest): boolean {
    if (condition.type === 'compound') {
      return this.evaluateCompound(condition, request);
    }

    return this.evaluateSimple(condition, request);
  }

  /**
   * Evaluate compound condition (AND, OR, NOT)
   */
  private evaluateCompound(condition: Condition, request: AccessRequest): boolean {
    if (!condition.conditions || condition.conditions.length === 0) {
      return true;
    }

    switch (condition.operator) {
      case 'and':
        return condition.conditions.every(c => this.evaluate(c, request));

      case 'or':
        return condition.conditions.some(c => this.evaluate(c, request));

      case 'not':
        return !this.evaluate(condition.conditions[0], request);

      default:
        return false;
    }
  }

  /**
   * Evaluate simple condition
   */
  private evaluateSimple(condition: Condition, request: AccessRequest): boolean {
    if (!condition.attribute || !condition.operator) {
      return false;
    }

    const actualValue = this.resolveAttribute(condition.attribute, request);
    const expectedValue = condition.value;

    return this.compareValues(actualValue, expectedValue, condition.operator);
  }

  /**
   * Resolve attribute from request context
   */
  private resolveAttribute(attribute: string, request: AccessRequest): unknown {
    const parts = attribute.split('.');
    let value: any = request;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Compare values using operator
   */
  private compareValues(actual: unknown, expected: unknown, operator: ConditionOperator): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;

      case 'not_equals':
        return actual !== expected;

      case 'contains':
        return this.contains(actual, expected);

      case 'not_contains':
        return !this.contains(actual, expected);

      case 'starts_with':
        return typeof actual === 'string' && typeof expected === 'string' &&
               actual.startsWith(expected);

      case 'ends_with':
        return typeof actual === 'string' && typeof expected === 'string' &&
               actual.endsWith(expected);

      case 'greater_than':
        return typeof actual === 'number' && typeof expected === 'number' &&
               actual > expected;

      case 'less_than':
        return typeof actual === 'number' && typeof expected === 'number' &&
               actual < expected;

      case 'matches':
        return this.matches(actual, expected);

      case 'in':
        return Array.isArray(expected) && expected.includes(actual);

      case 'not_in':
        return Array.isArray(expected) && !expected.includes(actual);

      default:
        return false;
    }
  }

  /**
   * Check if value contains substring or element
   */
  private contains(actual: unknown, expected: unknown): boolean {
    if (typeof actual === 'string' && typeof expected === 'string') {
      return actual.includes(expected);
    }

    if (Array.isArray(actual)) {
      return actual.includes(expected);
    }

    return false;
  }

  /**
   * Check if value matches regex pattern
   */
  private matches(actual: unknown, expected: unknown): boolean {
    if (typeof actual !== 'string' || typeof expected !== 'string') {
      return false;
    }

    try {
      const regex = new RegExp(expected);
      return regex.test(actual);
    } catch {
      return false;
    }
  }
}
