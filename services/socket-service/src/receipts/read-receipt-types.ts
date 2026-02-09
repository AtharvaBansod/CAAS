export interface ReadReceipt {
  message_id: string;
  conversation_id: string;
  read_by: string;
  read_at: Date;
}

export interface ReadPosition {
  user_id: string;
  conversation_id: string;
  tenant_id: string;
  last_read_message_id: string;
  last_read_at: Date;
  updated_at: Date;
}

export interface DeliveryReceipt {
  message_id: string;
  conversation_id: string;
  delivered_to: string;
  delivered_at: Date;
}

export interface DeliveryStatus {
  message_id: string;
  total_recipients: number;
  delivered_to: string[];
  pending: string[];
  failed: string[];
}
