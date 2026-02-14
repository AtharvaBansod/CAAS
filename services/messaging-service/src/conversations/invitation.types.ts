import { ObjectId } from 'mongodb';

export interface InviteLink {
  _id: ObjectId;
  id: string;
  conversation_id: string;
  tenant_id: string;
  code: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  expires_at?: Date;
  max_uses?: number;
  uses: number;
  is_active: boolean;
}

export interface InviteLinkOptions {
  expires_at?: Date;
  max_uses?: number;
  single_use?: boolean;
  require_approval?: boolean;
}