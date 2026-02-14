export interface AuditLog {
  _id?: string;
  conversation_id: string;
  action: string;
  actor_id: string;
  target_id?: string; // Can be user_id or message_id
  timestamp: Date;
  details?: Record<string, any>;
}
