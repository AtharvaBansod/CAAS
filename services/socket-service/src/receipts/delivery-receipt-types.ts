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

export interface DeliveryTrackingRecord {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  recipient_ids: string[];
  delivered_to: Set<string>;
  sent_at: Date;
}
