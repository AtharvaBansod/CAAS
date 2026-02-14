/**
 * Metrics Stage
 * 
 * Records processing metrics for monitoring
 */

import { PipelineStage, PipelineContext } from '../types';

export class MetricsStage implements PipelineStage {
  name = 'metrics';

  async execute(context: PipelineContext): Promise<PipelineContext> {
    const startTime = Date.now();

    try {
      // Calculate total pipeline duration
      const pipelineStartTime = context.startTime || Date.now();
      const totalDuration = Date.now() - pipelineStartTime;

      // Collect stage metrics
      const stageMetrics = context.metrics || {};

      // Record metrics
      this.recordMetrics({
        tenant_id: context.tenant?.tenant_id,
        message_id: context.message.message_id,
        conversation_id: context.message.conversation_id,
        total_duration_ms: totalDuration,
        stage_metrics: stageMetrics,
        success: !context.error,
        error: context.error,
      });

      // Record metrics for this stage
      context.metrics = context.metrics || {};
      context.metrics[this.name] = {
        duration_ms: Date.now() - startTime,
        success: true,
      };

      return context;
    } catch (error) {
      context.metrics = context.metrics || {};
      context.metrics[this.name] = {
        duration_ms: Date.now() - startTime,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      // Don't throw - metrics are non-critical
      console.error('Metrics stage error:', error);
      return context;
    }
  }

  /**
   * Record metrics to monitoring system
   */
  private recordMetrics(metrics: any): void {
    // TODO: Integrate with Prometheus or other monitoring system
    // For now, just log
    console.log('Pipeline metrics:', JSON.stringify(metrics, null, 2));
  }
}
