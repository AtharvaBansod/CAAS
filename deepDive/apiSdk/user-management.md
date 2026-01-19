# API SDK - User Management

> **Parent Roadmap**: [API SDK](../../roadmaps/7_apiSdk.md)

---

## Overview

User management API for creating, updating, and managing chat users.

---

## 1. Users API Interface

```typescript
interface UsersAPI {
  // Get current user
  me(): Promise<User>;
  
  // Get user by ID
  get(userId: string): Promise<User>;
  
  // List users with filters
  list(params?: ListUsersParams): Promise<PaginatedResponse<User>>;
  
  // Create/upsert user (server-side only)
  upsert(externalId: string, data: UpsertUserParams): Promise<User>;
  
  // Update user profile
  update(userId: string, data: UpdateUserParams): Promise<User>;
  
  // Delete user
  delete(userId: string): Promise<void>;
  
  // Block/unblock user
  block(userId: string): Promise<void>;
  unblock(userId: string): Promise<void>;
  
  // Get blocked users
  getBlocked(): Promise<User[]>;
}
```

---

## 2. User Model

```typescript
interface User {
  id: string;
  externalId: string;        // Client's user ID
  tenantId: string;
  
  displayName: string;
  avatarUrl?: string;
  email?: string;
  
  status: 'online' | 'offline' | 'away' | 'dnd';
  customStatus?: string;
  lastSeenAt: Date;
  
  metadata?: Record<string, any>;
  
  createdAt: Date;
  updatedAt: Date;
}

interface UpsertUserParams {
  displayName: string;
  avatarUrl?: string;
  email?: string;
  metadata?: Record<string, any>;
}

interface UpdateUserParams {
  displayName?: string;
  avatarUrl?: string;
  customStatus?: string;
  metadata?: Record<string, any>;
}
```

---

## 3. Implementation

```typescript
class UsersAPIImpl implements UsersAPI {
  constructor(private http: HttpClient) {}
  
  async me(): Promise<User> {
    const response = await this.http.get<User>('/users/me');
    return response.data;
  }
  
  async get(userId: string): Promise<User> {
    const response = await this.http.get<User>(`/users/${userId}`);
    return response.data;
  }
  
  async list(params: ListUsersParams = {}): Promise<PaginatedResponse<User>> {
    const response = await this.http.get<User[]>('/users', { params });
    
    return {
      data: response.data,
      hasMore: response.data.length === (params.limit || 50),
      nextCursor: response.data[response.data.length - 1]?.id
    };
  }
  
  async upsert(externalId: string, data: UpsertUserParams): Promise<User> {
    const response = await this.http.put<User>(
      `/users/external/${externalId}`,
      data
    );
    return response.data;
  }
  
  async update(userId: string, data: UpdateUserParams): Promise<User> {
    const response = await this.http.patch<User>(`/users/${userId}`, data);
    return response.data;
  }
  
  async delete(userId: string): Promise<void> {
    await this.http.delete(`/users/${userId}`);
  }
  
  async block(userId: string): Promise<void> {
    await this.http.post(`/users/${userId}/block`);
  }
  
  async unblock(userId: string): Promise<void> {
    await this.http.delete(`/users/${userId}/block`);
  }
  
  async getBlocked(): Promise<User[]> {
    const response = await this.http.get<User[]>('/users/blocked');
    return response.data;
  }
}
```

---

## 4. Server-Side User Sync

```typescript
// Sync users from client's system
class UserSyncService {
  async syncUser(externalUser: ExternalUser): Promise<User> {
    return caas.users.upsert(externalUser.id, {
      displayName: externalUser.name,
      avatarUrl: externalUser.avatar,
      email: externalUser.email,
      metadata: {
        role: externalUser.role,
        department: externalUser.department
      }
    });
  }
  
  async bulkSync(users: ExternalUser[]): Promise<void> {
    // Batch sync for initial import
    const batches = chunk(users, 100);
    
    for (const batch of batches) {
      await Promise.all(
        batch.map(user => this.syncUser(user))
      );
    }
  }
}
```

---

## 5. Usage Examples

```typescript
// Get current user
const me = await caas.users.me();

// Update profile
await caas.users.update(me.id, {
  displayName: 'New Name',
  customStatus: 'In a meeting'
});

// Search users
const { data: users } = await caas.users.list({
  search: 'john',
  limit: 20
});

// Block a user
await caas.users.block('user_xyz');
```

---

## Related Documents
- [Messaging API](./messaging-api.md)
- [HTTP Client](./http-client.md)
