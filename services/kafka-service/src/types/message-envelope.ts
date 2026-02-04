export interface KafkaMessage<T = any> {
  id: string;                    // UUID v7 for ordering
  type: string;                  // Event type
  version: string;               // Schema version
  timestamp: number;             // Unix timestamp ms
  tenant_id: string;             // Tenant identifier
  source: string;                // Service that produced
  correlation_id?: string;       // For request tracing
  trace_id?: string;             // Distributed tracing
  payload: T;
  metadata: MessageMetadata;
}

export interface MessageMetadata {
  retry_count?: number;
  original_timestamp?: number;
  user_agent?: string;
  ip_address?: string;
  user_id?: string;
  session_id?: string;
  device_id?: string;
  request_id?: string;
  [key: string]: any;
}

export interface MessageHeaders {
  [key: string]: string | Buffer | (string | Buffer)[] | undefined;
}

export interface KafkaMessageWithHeaders<T = any> {
  key?: string;
  value: KafkaMessage<T>;
  headers?: MessageHeaders;
  partition?: number;
  timestamp?: string;
}