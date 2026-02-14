export interface TenantSettings {
  [key: string]: any;
}

export interface TenantLimits {
  api_rate_limit: number;
  monthly_quota?: number;
  max_users: number;
  storage_limit_gb: number;
  [key: string]: any;
}

export interface TenantContext {
  tenant_id: string;
  id?: string; // Alias for tenant_id or app_id, used by admin/MFA routes
  app_id: string;
  name: string;
  plan: 'free' | 'startup' | 'business' | 'enterprise';
  settings: TenantSettings;
  limits: TenantLimits;
  database_strategy: 'shared' | 'collection' | 'database';
  is_active: boolean;
  created_at: Date;
}

