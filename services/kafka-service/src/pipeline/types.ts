/**
 * Pipeline Types
 * 
 * Type definitions for Kafka message pipeline
 */

export interface PipelineContext {
  message: any;
  tenant?: {
    tenant_id: string;
    tenant_name: string;
    is_active: boolean;
    settings?: Record<string, any>;
  };
  metadata?: Record<string, any>;
  metrics?: Record<string, {
    duration_ms: number;
    success: boolean;
    error?: string;
    [key: string]: any;
  }>;
  error?: Error;
  aborted?: boolean;
  startTime?: number;
}

export interface PipelineStage {
  name: string;
  execute(context: PipelineContext): Promise<PipelineContext>;
}
