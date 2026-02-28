export interface AuthContext {
  tenant_id: string;
  project_id?: string;
  user_id?: string;
  auth_type: 'api_key' | 'jwt' | 'sdk';
  permissions: string[];
  rate_limit_tier: string;
  metadata: Record<string, unknown>;
}
