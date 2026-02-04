# Client Facing UI - State Management

> **Parent Roadmap**: [Client Facing UI](../../roadmaps/1_clientFacingUI.md)

---

## Overview

State management patterns using Zustand and React Query for the client portal.

---

## 1. Architecture

```
┌─────────────────────────────────────────────────┐
│                  React Components                │
├────────────────────┬────────────────────────────┤
│    Zustand Store   │       React Query          │
│  (Client State)    │    (Server State)          │
├────────────────────┴────────────────────────────┤
│                    CAAS API                      │
└─────────────────────────────────────────────────┘
```

---

## 2. Zustand Store

```typescript
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface AppState {
  // UI State
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  
  // Current selections
  selectedAppId: string | null;
  selectedEnvironment: 'development' | 'staging' | 'production';
  
  // Actions
  toggleSidebar: () => void;
  setTheme: (theme: AppState['theme']) => void;
  selectApp: (appId: string) => void;
  selectEnvironment: (env: AppState['selectedEnvironment']) => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        sidebarOpen: true,
        theme: 'system',
        selectedAppId: null,
        selectedEnvironment: 'production',
        
        toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
        setTheme: (theme) => set({ theme }),
        selectApp: (appId) => set({ selectedAppId: appId }),
        selectEnvironment: (env) => set({ selectedEnvironment: env })
      }),
      { name: 'caas-client-store' }
    )
  )
);
```

---

## 3. React Query Setup

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 minutes
      gcTime: 30 * 60 * 1000,        // 30 minutes
      retry: 3,
      refetchOnWindowFocus: false
    }
  }
});

// Query keys factory
export const queryKeys = {
  applications: ['applications'] as const,
  application: (id: string) => ['applications', id] as const,
  analytics: (appId: string, range: string) => ['analytics', appId, range] as const,
  apiKeys: (appId: string) => ['apiKeys', appId] as const
};
```

---

## 4. Custom Hooks

```typescript
// Applications query
export function useApplications() {
  return useQuery({
    queryKey: queryKeys.applications,
    queryFn: () => api.applications.list()
  });
}

// Single application
export function useApplication(id: string) {
  return useQuery({
    queryKey: queryKeys.application(id),
    queryFn: () => api.applications.get(id),
    enabled: !!id
  });
}

// Mutation with optimistic update
export function useUpdateApplication() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => api.applications.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.application(id) });
      const previous = queryClient.getQueryData(queryKeys.application(id));
      
      queryClient.setQueryData(queryKeys.application(id), (old) => ({
        ...old,
        ...data
      }));
      
      return { previous };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(
        queryKeys.application(variables.id),
        context.previous
      );
    },
    onSettled: (data, error, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.application(id) });
    }
  });
}
```

---

## 5. Authentication State

```typescript
interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: Credentials) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  
  login: async (credentials) => {
    const { user, token } = await api.auth.login(credentials);
    localStorage.setItem('token', token);
    set({ user, isAuthenticated: true, isLoading: false });
  },
  
  logout: async () => {
    await api.auth.logout();
    localStorage.removeItem('token');
    set({ user: null, isAuthenticated: false });
  }
}));
```

---

## Related Documents
- [Design System](./design-system.md)
- [Authentication Flow](./authentication-flow.md)
