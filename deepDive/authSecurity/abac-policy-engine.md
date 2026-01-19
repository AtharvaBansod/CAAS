# Auth Security - ABAC Policy Engine

> **Parent Roadmap**: [Auth & Security](../../roadmaps/3_AuthAutorizeSecurity.md)

---

## Overview

Attribute-Based Access Control (ABAC) engine for fine-grained authorization decisions.

---

## 1. Policy Structure

```typescript
interface Policy {
  id: string;
  name: string;
  description: string;
  effect: 'allow' | 'deny';
  priority: number;             // Higher = evaluated first
  
  // Conditions
  subjects: SubjectCondition;   // Who
  resources: ResourceCondition; // What
  actions: string[];            // How (read, write, delete, etc.)
  conditions?: Condition[];     // When/Where
}

interface SubjectCondition {
  roles?: string[];
  userIds?: string[];
  attributes?: Record<string, any>;
}

interface ResourceCondition {
  types?: string[];             // conversation, message, file
  attributes?: Record<string, any>;
  ownerMatch?: boolean;         // resource.ownerId === subject.userId
}

interface Condition {
  type: 'time' | 'ip' | 'location' | 'custom';
  operator: 'eq' | 'neq' | 'in' | 'between' | 'matches';
  field: string;
  value: any;
}
```

---

## 2. Policy Examples

```typescript
const policies: Policy[] = [
  // Admins can do anything
  {
    id: 'admin-full-access',
    name: 'Admin Full Access',
    effect: 'allow',
    priority: 100,
    subjects: { roles: ['admin'] },
    resources: { types: ['*'] },
    actions: ['*']
  },
  
  // Users can read their own conversations
  {
    id: 'user-own-conversations',
    name: 'User Own Conversations',
    effect: 'allow',
    priority: 50,
    subjects: { roles: ['user'] },
    resources: { 
      types: ['conversation'],
      ownerMatch: true 
    },
    actions: ['read', 'write']
  },
  
  // Block access outside business hours
  {
    id: 'business-hours-only',
    name: 'Business Hours Restriction',
    effect: 'deny',
    priority: 200,
    subjects: { attributes: { department: 'external' } },
    resources: { types: ['*'] },
    actions: ['*'],
    conditions: [{
      type: 'time',
      operator: 'between',
      field: 'hour',
      value: { outside: [9, 18] }  // Deny outside 9 AM - 6 PM
    }]
  }
];
```

---

## 3. Policy Engine Implementation

```typescript
class PolicyEngine {
  private policies: Policy[] = [];
  
  async evaluate(request: AuthorizationRequest): Promise<AuthorizationDecision> {
    const matchingPolicies = this.findMatchingPolicies(request);
    
    // Sort by priority (highest first)
    matchingPolicies.sort((a, b) => b.priority - a.priority);
    
    // Deny takes precedence at same priority level
    for (const policy of matchingPolicies) {
      const matches = await this.evaluatePolicy(policy, request);
      
      if (matches) {
        return {
          allowed: policy.effect === 'allow',
          policy: policy.id,
          reason: `Matched policy: ${policy.name}`
        };
      }
    }
    
    // Default deny
    return {
      allowed: false,
      reason: 'No matching policy found'
    };
  }
  
  private findMatchingPolicies(request: AuthorizationRequest): Policy[] {
    return this.policies.filter(policy => {
      // Check subject match
      if (!this.matchesSubject(policy.subjects, request.subject)) {
        return false;
      }
      
      // Check resource match
      if (!this.matchesResource(policy.resources, request.resource)) {
        return false;
      }
      
      // Check action match
      if (!this.matchesAction(policy.actions, request.action)) {
        return false;
      }
      
      return true;
    });
  }
  
  private async evaluatePolicy(
    policy: Policy, 
    request: AuthorizationRequest
  ): Promise<boolean> {
    if (!policy.conditions || policy.conditions.length === 0) {
      return true;
    }
    
    // All conditions must match
    for (const condition of policy.conditions) {
      if (!await this.evaluateCondition(condition, request.context)) {
        return false;
      }
    }
    
    return true;
  }
}
```

---

## 4. Authorization Request

```typescript
interface AuthorizationRequest {
  subject: {
    userId: string;
    tenantId: string;
    roles: string[];
    attributes: Record<string, any>;
  };
  resource: {
    type: string;
    id: string;
    ownerId?: string;
    tenantId: string;
    attributes: Record<string, any>;
  };
  action: string;
  context: {
    ip: string;
    userAgent: string;
    timestamp: Date;
    location?: { country: string; region: string };
  };
}

// Usage in middleware
async function authorize(req: Request, res: Response, next: NextFunction) {
  const decision = await policyEngine.evaluate({
    subject: {
      userId: req.user.id,
      tenantId: req.user.tenantId,
      roles: req.user.roles,
      attributes: req.user.attributes
    },
    resource: {
      type: 'conversation',
      id: req.params.conversationId,
      tenantId: req.params.tenantId,
      ownerId: await getResourceOwner(req.params.conversationId)
    },
    action: 'read',
    context: {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date()
    }
  });
  
  if (!decision.allowed) {
    return res.status(403).json({ error: 'Forbidden', reason: decision.reason });
  }
  
  next();
}
```

---

## 5. Policy Storage

```typescript
// MongoDB policy collection
interface PolicyDocument {
  _id: ObjectId;
  tenant_id: ObjectId;          // Tenant-specific policies
  policy: Policy;
  enabled: boolean;
  created_at: Date;
  updated_at: Date;
  created_by: ObjectId;
}

// Cache policies in Redis
class PolicyCache {
  async getPolicies(tenantId: string): Promise<Policy[]> {
    const cached = await redis.get(`policies:${tenantId}`);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const policies = await db.policies.find({ tenant_id: tenantId, enabled: true });
    await redis.setex(`policies:${tenantId}`, 300, JSON.stringify(policies));
    
    return policies;
  }
  
  async invalidate(tenantId: string): Promise<void> {
    await redis.del(`policies:${tenantId}`);
  }
}
```

---

## 6. Policy Management API

```typescript
// POST /api/policies
router.post('/policies', async (req, res) => {
  const policy = await policyService.create(req.tenantId, req.body);
  await policyCache.invalidate(req.tenantId);
  res.json(policy);
});

// PUT /api/policies/:id
router.put('/policies/:id', async (req, res) => {
  const policy = await policyService.update(req.params.id, req.body);
  await policyCache.invalidate(req.tenantId);
  res.json(policy);
});

// POST /api/policies/test - Test policy against request
router.post('/policies/test', async (req, res) => {
  const decision = await policyEngine.evaluate(req.body);
  res.json(decision);
});
```

---

## Related Documents
- [Authorization Decision Flow](../../flowdiagram/authorization-decision-flow.md)
- [Client Authentication](./client-authentication.md)
