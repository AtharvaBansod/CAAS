export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserContext {
  userId: string;
  email: string;
  roles: string[];
  tenantId: string;
}
