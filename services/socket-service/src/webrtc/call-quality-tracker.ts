import { RedisClientType } from 'redis';
import { CallQualityMetrics } from './call-types';
import { getLogger } from '../utils/logger';

const logger = getLogger('CallQualityTracker');

export interface QualityReport {
    call_id: string;
    user_id: string;
    timestamp: Date;
    latency_ms?: number;
    packet_loss_percentage?: number;
    jitter_ms?: number;
    bitrate_kbps?: number;
    frame_rate?: number;
    resolution?: string;
}

export interface CallAnalytics {
    call_id: string;
    duration_seconds: number;
    participant_count: number;
    quality_metrics: CallQualityMetrics;
    quality_reports: QualityReport[];
    issues: QualityIssue[];
}

export interface QualityIssue {
    type: 'high_latency' | 'packet_loss' | 'low_bitrate' | 'connection_drop';
    severity: 'low' | 'medium' | 'high';
    timestamp: Date;
    description: string;
}

export class CallQualityTracker {
    private readonly QUALITY_PREFIX = 'call:quality:';
    private readonly ANALYTICS_PREFIX = 'call:analytics:';

    constructor(private redis: RedisClientType) { }

    /**
     * Record quality metrics for a call
     */
    async recordQualityReport(report: QualityReport): Promise<void> {
        try {
            const key = `${this.QUALITY_PREFIX}${report.call_id}`;

            // Store report in a list
            await this.redis.rPush(key, JSON.stringify(report));

            // Set expiration (24 hours)
            await this.redis.expire(key, 24 * 60 * 60);

            // Update aggregate metrics
            await this.updateAggregateMetrics(report);

            logger.debug(`Recorded quality report for call ${report.call_id} from user ${report.user_id}`);
        } catch (error: any) {
            logger.error(`Failed to record quality report`, error);
        }
    }

    /**
     * Update aggregate quality metrics
     */
    private async updateAggregateMetrics(report: QualityReport): Promise<void> {
        const metricsKey = `${this.ANALYTICS_PREFIX}${report.call_id}`;

        try {
            if (report.latency_ms !== undefined) {
                await this.redis.hIncrBy(metricsKey, 'total_latency_ms', report.latency_ms);
                await this.redis.hIncrBy(metricsKey, 'latency_samples', 1);
            }

            if (report.packet_loss_percentage !== undefined) {
                await this.redis.hIncrByFloat(metricsKey, 'total_packet_loss', report.packet_loss_percentage);
                await this.redis.hIncrBy(metricsKey, 'packet_loss_samples', 1);
            }

            if (report.jitter_ms !== undefined) {
                await this.redis.hIncrBy(metricsKey, 'total_jitter_ms', report.jitter_ms);
                await this.redis.hIncrBy(metricsKey, 'jitter_samples', 1);
            }

            await this.redis.expire(metricsKey, 24 * 60 * 60);
        } catch (error: any) {
            logger.error(`Failed to update aggregate metrics`, error);
        }
    }

    /**
     * Get quality metrics for a call
     */
    async getCallQualityMetrics(callId: string): Promise<CallQualityMetrics> {
        try {
            const metricsKey = `${this.ANALYTICS_PREFIX}${callId}`;
            const data = await this.redis.hGetAll(metricsKey);

            const latencySamples = parseInt(data.latency_samples || '0', 10);
            const packetLossSamples = parseInt(data.packet_loss_samples || '0', 10);
            const jitterSamples = parseInt(data.jitter_samples || '0', 10);

            return {
                average_latency_ms: latencySamples > 0
                    ? Math.round(parseInt(data.total_latency_ms || '0', 10) / latencySamples)
                    : undefined,
                packet_loss_percentage: packetLossSamples > 0
                    ? parseFloat((parseFloat(data.total_packet_loss || '0') / packetLossSamples).toFixed(2))
                    : undefined,
                jitter_ms: jitterSamples > 0
                    ? Math.round(parseInt(data.total_jitter_ms || '0', 10) / jitterSamples)
                    : undefined,
            };
        } catch (error: any) {
            logger.error(`Failed to get quality metrics for call ${callId}`, error);
            return {};
        }
    }

    /**
     * Get all quality reports for a call
     */
    async getQualityReports(callId: string): Promise<QualityReport[]> {
        try {
            const key = `${this.QUALITY_PREFIX}${callId}`;
            const reports = await this.redis.lRange(key, 0, -1);

            return reports.map(r => JSON.parse(r) as QualityReport);
        } catch (error: any) {
            logger.error(`Failed to get quality reports for call ${callId}`, error);
            return [];
        }
    }

    /**
     * Analyze call quality and detect issues
     */
    async analyzeCallQuality(callId: string): Promise<QualityIssue[]> {
        const reports = await this.getQualityReports(callId);
        const issues: QualityIssue[] = [];

        for (const report of reports) {
            // High latency detection
            if (report.latency_ms && report.latency_ms > 300) {
                issues.push({
                    type: 'high_latency',
                    severity: report.latency_ms > 500 ? 'high' : 'medium',
                    timestamp: report.timestamp,
                    description: `High latency detected: ${report.latency_ms}ms`,
                });
            }

            // Packet loss detection
            if (report.packet_loss_percentage && report.packet_loss_percentage > 5) {
                issues.push({
                    type: 'packet_loss',
                    severity: report.packet_loss_percentage > 10 ? 'high' : 'medium',
                    timestamp: report.timestamp,
                    description: `Packet loss detected: ${report.packet_loss_percentage}%`,
                });
            }

            // Low bitrate detection
            if (report.bitrate_kbps && report.bitrate_kbps < 100) {
                issues.push({
                    type: 'low_bitrate',
                    severity: report.bitrate_kbps < 50 ? 'high' : 'low',
                    timestamp: report.timestamp,
                    description: `Low bitrate: ${report.bitrate_kbps} kbps`,
                });
            }
        }

        return issues;
    }

    /**
     * Get comprehensive call analytics
     */
    async getCallAnalytics(callId: string, durationSeconds: number, participantCount: number): Promise<CallAnalytics> {
        const metrics = await this.getCallQualityMetrics(callId);
        const reports = await this.getQualityReports(callId);
        const issues = await this.analyzeCallQuality(callId);

        return {
            call_id: callId,
            duration_seconds: durationSeconds,
            participant_count: participantCount,
            quality_metrics: metrics,
            quality_reports: reports,
            issues,
        };
    }
}
