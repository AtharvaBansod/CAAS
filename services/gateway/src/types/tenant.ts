export interface Tenant {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'suspended';
  plan: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantContext {
  tenantId: string;
  plan: string;
  features: string[];
}
