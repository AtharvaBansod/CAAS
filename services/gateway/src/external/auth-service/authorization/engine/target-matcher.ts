/**
 * Target Matcher
 * Phase 2 - Authorization - Task AUTHZ-001
 * 
 * Matches policy targets against access requests
 */

import {
  PolicyTarget,
  SubjectMatcher,
  ResourceMatcher,
  ActionMatcher,
  EnvironmentMatcher,
  AccessRequest,
  MatchOperator,
} from './types';

export class TargetMatcher {
  /**
   * Check if policy target matches request
   */
  matches(target: PolicyTarget, request: AccessRequest): boolean {
    return (
      this.matchesSubjects(target.subjects, request) &&
      this.matchesResources(target.resources, request) &&
      this.matchesActions(target.actions, request) &&
      this.matchesEnvironment(target.environment, request)
    );
  }

  /**
   * Match subject matchers
   */
  private matchesSubjects(matchers: SubjectMatcher[], request: AccessRequest): boolean {
    if (matchers.length === 0) {
      return true; // No subject restrictions
    }

    return matchers.some(matcher => this.matchSubject(matcher, request));
  }

  /**
   * Match single subject matcher
   */
  private matchSubject(matcher: SubjectMatcher, request: AccessRequest): boolean {
    const { subject } = request;

    switch (matcher.type) {
      case 'user':
        return this.matchValue(subject.user_id, matcher.value, matcher.operator);

      case 'role':
        return subject.roles.some(role => this.matchValue(role, matcher.value, matcher.operator));

      case 'attribute':
        const attribute = matcher.attribute;
        if (!attribute) return false;
        const attrValue = subject.attributes[attribute];
        return this.matchValue(attrValue, matcher.value, matcher.operator);

      default:
        return false;
    }
  }

  /**
   * Match resource matchers
   */
  private matchesResources(matchers: ResourceMatcher[], request: AccessRequest): boolean {
    if (matchers.length === 0) {
      return true; // No resource restrictions
    }

    return matchers.some(matcher => this.matchResource(matcher, request));
  }

  /**
   * Match single resource matcher
   */
  private matchResource(matcher: ResourceMatcher, request: AccessRequest): boolean {
    const { resource } = request;

    switch (matcher.type) {
      case 'type':
        return this.matchValue(resource.type, matcher.value, matcher.operator);

      case 'id':
        return this.matchValue(resource.id, matcher.value, matcher.operator);

      case 'owner':
        return this.matchValue(resource.owner_id, matcher.value, matcher.operator);

      case 'attribute':
        const attribute = matcher.attribute;
        if (!attribute) return false;
        const attrValue = resource.attributes[attribute];
        return this.matchValue(attrValue, matcher.value, matcher.operator);

      default:
        return false;
    }
  }

  /**
   * Match action matchers
   */
  private matchesActions(matchers: ActionMatcher[], request: AccessRequest): boolean {
    if (matchers.length === 0) {
      return true; // No action restrictions
    }

    return matchers.some(matcher => this.matchAction(matcher, request));
  }

  /**
   * Match single action matcher
   */
  private matchAction(matcher: ActionMatcher, request: AccessRequest): boolean {
    return this.matchValue(request.action, matcher.value, matcher.operator);
  }

  /**
   * Match environment matchers
   */
  private matchesEnvironment(
    matchers: EnvironmentMatcher[] | undefined,
    request: AccessRequest
  ): boolean {
    if (!matchers || matchers.length === 0) {
      return true; // No environment restrictions
    }

    return matchers.every(matcher => this.matchEnvironment(matcher, request));
  }

  /**
   * Match single environment matcher
   */
  private matchEnvironment(matcher: EnvironmentMatcher, request: AccessRequest): boolean {
    const envValue = (request.environment as any)[matcher.attribute];
    return this.matchValue(envValue, matcher.value, matcher.operator);
  }

  /**
   * Match value using operator
   */
  private matchValue(actual: unknown, expected: unknown, operator: MatchOperator): boolean {
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

      case 'greater_than_or_equal':
        return typeof actual === 'number' && typeof expected === 'number' &&
          actual >= expected;

      case 'less_than_or_equal':
        return typeof actual === 'number' && typeof expected === 'number' &&
          actual <= expected;

      case 'matches':
        return this.matchesRegex(actual, expected);

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

    // Wildcard matching for actions
    if (typeof actual === 'string' && typeof expected === 'string') {
      if (expected.includes('*')) {
        const pattern = expected.replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(actual);
      }
    }

    return false;
  }

  /**
   * Check if value matches regex
   */
  private matchesRegex(actual: unknown, expected: unknown): boolean {
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
