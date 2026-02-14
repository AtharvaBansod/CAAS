import { ObjectId } from 'mongodb';

export interface MutedUser {
  _id: ObjectId;
  id: string;
  conversation_id: string;
  user_id: string;
  muted_by: string;
  muted_at: Date;
  expires_at?: Date | null; // For temporary mutes
  is_active: boolean;
}

export interface BannedUser {
  _id: ObjectId;
  id: string;
  conversation_id: string;
  user_id: string;
  banned_by: string;
  banned_at: Date;
  reason?: string | null;
  is_active: boolean;
}