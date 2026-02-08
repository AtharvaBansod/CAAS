export interface GroupCreatedEvent {
  group_id: string;
  tenant_id: string;
  creator_id: string;
  name: string;
  description?: string;
  created_at: number;
}

export interface GroupUpdatedEvent {
  group_id: string;
  tenant_id: string;
  updated_by: string;
  updates: Record<string, any>;
  updated_at: number;
}

export interface GroupDeletedEvent {
  group_id: string;
  tenant_id: string;
  deleted_by: string;
  deleted_at: number;
}

export interface MemberJoinedEvent {
  group_id: string;
  tenant_id: string;
  user_id: string;
  joined_at: number;
  role: 'member' | 'admin';
}

export interface MemberLeftEvent {
  group_id: string;
  tenant_id: string;
  user_id: string;
  left_at: number;
  reason?: string;
}

export interface MemberRoleChangedEvent {
  group_id: string;
  tenant_id: string;
  user_id: string;
  changed_by: string;
  old_role: string;
  new_role: string;
  changed_at: number;
}
