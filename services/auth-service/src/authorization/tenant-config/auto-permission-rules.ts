/**
 * Auto Permission Rules
 * Automatically grant permissions based on conditions
 */

export interface AutoPermissionRule {
  id: string;
  name: string;
  description: string;
  condition: RuleCondition;
  grant: string[];
  priority: number;
  is_active: boolean;
}

export interface RuleCondition {
  type: 'user_attribute' | 'user_role' | 'resource_attribute' | 'time_based' | 'composite';
  attribute?: string;
  operator?: 'equals' | 'contains' | 'in' | 'matches';
  value?: any;
  conditions?: RuleCondition[]; // For composite conditions
  combinator?: 'and' | 'or';
}

export class AutoPermissionRuleEngine {
  /**
   * Evaluate if a rule applies to a user
   */
  evaluateRule(rule: AutoPermissionRule, context: RuleContext): boolean {
    if (!rule.is_active) {
      return false;
    }

    return this.evaluateCondition(rule.condition, context);
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: RuleCondition, context: RuleContext): boolean {
    switch (condition.type) {
      case 'user_attribute':
        return this.evaluateUserAttribute(condition, context);
      
      case 'user_role':
        return this.evaluateUserRole(condition, context);
      
      case 'resource_attribute':
        return this.evaluateResourceAttribute(condition, context);
      
      case 'time_based':
        return this.evaluateTimeBased(condition, context);
      
      case 'composite':
        return this.evaluateComposite(condition, context);
      
      default:
        return false;
    }
  }

  /**
   * Evaluate user attribute condition
   */
  private evaluateUserAttribute(condition: RuleCondition, context: RuleContext): boolean {
    if (!condition.attribute || !context.user_attributes) {
      return false;
    }

    const userValue = context.user_attributes[condition.attribute];
    
    switch (condition.operator) {
      case 'equals':
        return userValue === condition.value;
      
      case 'contains':
        return String(userValue).includes(String(condition.value));
      
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(userValue);
      
      case 'matches':
        return new RegExp(condition.value).test(String(userValue));
      
      default:
        return false;
    }
  }

  /**
   * Evaluate user role condition
   */
  private evaluateUserRole(condition: RuleCondition, context: RuleContext): boolean {
    if (!context.user_roles) {
      return false;
    }

    if (condition.operator === 'in' && Array.isArray(condition.value)) {
      return condition.value.some(role => context.user_roles!.includes(role));
    }

    return context.user_roles.includes(condition.value);
  }

  /**
   * Evaluate resource attribute condition
   */
  private evaluateResourceAttribute(condition: RuleCondition, context: RuleContext): boolean {
    if (!condition.attribute || !context.resource_attributes) {
      return false;
    }

    const resourceValue = context.resource_attributes[condition.attribute];
    
    switch (condition.operator) {
      case 'equals':
        return resourceValue === condition.value;
      
      case 'contains':
        return String(resourceValue).includes(String(condition.value));
      
      default:
        return false;
    }
  }

  /**
   * Evaluate time-based condition
   */
  private evaluateTimeBased(condition: RuleCondition, context: RuleContext): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday

    // Example: { value: { hours: [9, 17], days: [1, 2, 3, 4, 5] } }
    if (condition.value?.hours) {
      const [startHour, endHour] = condition.value.hours;
      if (currentHour < startHour || currentHour >= endHour) {
        return false;
      }
    }

    if (condition.value?.days) {
      if (!condition.value.days.includes(currentDay)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate composite condition (AND/OR)
   */
  private evaluateComposite(condition: RuleCondition, context: RuleContext): boolean {
    if (!condition.conditions || condition.conditions.length === 0) {
      return false;
    }

    const results = condition.conditions.map(c => this.evaluateCondition(c, context));

    if (condition.combinator === 'or') {
      return results.some(r => r);
    }

    // Default to AND
    return results.every(r => r);
  }

  /**
   * Get all permissions that should be auto-granted
   */
  getAutoGrantedPermissions(rules: AutoPermissionRule[], context: RuleContext): string[] {
    const permissions = new Set<string>();

    // Sort by priority (higher first)
    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (this.evaluateRule(rule, context)) {
        rule.grant.forEach(p => permissions.add(p));
      }
    }

    return Array.from(permissions);
  }
}

export interface RuleContext {
  user_id: string;
  user_attributes?: Record<string, any>;
  user_roles?: string[];
  resource_type?: string;
  resource_attributes?: Record<string, any>;
  tenant_id: string;
}
