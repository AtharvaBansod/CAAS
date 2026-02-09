import { RedisClientType } from 'redis';
import { getLogger } from '../utils/logger';

const logger = getLogger('SpamDetector');

export enum AbuseType {
  SPAM = 'spam',
  FLOOD = 'flood',
  DUPLICATE = 'duplicate',
  EXCESSIVE_TYPING = 'excessive_typing',
}

export interface SpamResult {
  is_spam: boolean;
  confidence: number;
  reasons: string[];
}

export interface FloodResult {
  is_flooding: boolean;
  request_count: number;
  threshold: number;
}

export interface AbuseReport {
  user_id: string;
  tenant_id: string;
  type: AbuseType;
  timestamp: Date;
  details?: any;
}

export class SpamDetector {
  private readonly DUPLICATE_WINDOW_MS = 5000;
  private readonly FLOOD_THRESHOLD = 10;
  private readonly FLOOD_WINDOW_MS = 1000;
  private readonly ABUSE_REPORT_TTL = 3600;

  constructor(
    private redisClient: RedisClientType,
    private keyPrefix: string = 'abuse'
  ) {}

  async detectSpam(userId: string, content: string, tenantId: string): Promise<SpamResult> {
    const reasons: string[] = [];
    let confidence = 0;
    const isDuplicate = await this.checkDuplicate(userId, content, tenantId);
    if (isDuplicate) {
      reasons.push('Duplicate message detected');
      confidence += 0.5;
    }
    if (content.length > 5000) {
      reasons.push('Message too long');
      confidence += 0.3;
    }
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.7 && content.length > 10) {
      reasons.push('Excessive capital letters');
      confidence += 0.2;
    }
    if (/(.)\1{10,}/.test(content)) {
      reasons.push('Repeated characters detected');
      confidence += 0.4;
    }
    const urlCount = (content.match(/https?:\/\//g) || []).length;
    if (urlCount > 3) {
      reasons.push('Excessive URLs');
      confidence += 0.3;
    }
    const isSpam = confidence >= 0.7;
    if (isSpam) {
      await this.reportAbuse({
        user_id: userId,
        tenant_id: tenantId,
        type: AbuseType.SPAM,
        timestamp: new Date(),
        details: { content, reasons, confidence },
      });
    }
    return { is_spam: isSpam, confidence: Math.min(confidence, 1.0), reasons };
  }

  async checkFlood(userId: string, tenantId: string): Promise<FloodResult> {
    const key = `${this.keyPrefix}:flood:${tenantId}:${userId}`;
    const now = Date.now();
    const windowStart = now - this.FLOOD_WINDOW_MS;
    try {
      await this.redisClient.zRemRangeByScore(key, 0, windowStart);
      await this.redisClient.zAdd(key, { score: now, value: `${now}` });
      await this.redisClient.expire(key, 2);
      const count = await this.redisClient.zCard(key);
      const isFlooding = count > this.FLOOD_THRESHOLD;
      if (isFlooding) {
        await this.reportAbuse({
          user_id: userId,
          tenant_id: tenantId,
          type: AbuseType.FLOOD,
          timestamp: new Date(),
          details: { count, threshold: this.FLOOD_THRESHOLD },
        });
      }
      return { is_flooding: isFlooding, request_count: count, threshold: this.FLOOD_THRESHOLD };
    } catch (error: any) {
      logger.error(`Flood check failed for user ${userId}: ${error.message}`);
      return { is_flooding: false, request_count: 0, threshold: this.FLOOD_THRESHOLD };
    }
  }

  private async checkDuplicate(userId: string, content: string, tenantId: string): Promise<boolean> {
    const key = `${this.keyPrefix}:duplicate:${tenantId}:${userId}`;
    const contentHash = this.hashContent(content);
    try {
      const exists = await this.redisClient.get(`${key}:${contentHash}`);
      if (exists) return true;
      await this.redisClient.setEx(`${key}:${contentHash}`, Math.ceil(this.DUPLICATE_WINDOW_MS / 1000), '1');
      return false;
    } catch (error: any) {
      logger.error(`Duplicate check failed: ${error.message}`);
      return false;
    }
  }

  private async reportAbuse(report: AbuseReport): Promise<void> {
    const key = `${this.keyPrefix}:reports:${report.tenant_id}:${report.user_id}`;
    try {
      const reportData = JSON.stringify({ ...report, timestamp: report.timestamp.toISOString() });
      await this.redisClient.zAdd(key, { score: report.timestamp.getTime(), value: reportData });
      await this.redisClient.expire(key, this.ABUSE_REPORT_TTL);
      logger.warn(`Abuse reported: ${report.type} by user ${report.user_id} in tenant ${report.tenant_id}`);
    } catch (error: any) {
      logger.error(`Failed to report abuse: ${error.message}`);
    }
  }

  async getAbuseReports(userId: string, tenantId: string, limit: number = 10): Promise<AbuseReport[]> {
    const key = `${this.keyPrefix}:reports:${tenantId}:${userId}`;
    try {
      const reports = await this.redisClient.zRange(key, 0, limit - 1);
      return reports.map((report) => {
        const parsed = JSON.parse(report);
        return { ...parsed, timestamp: new Date(parsed.timestamp) };
      });
    } catch (error: any) {
      logger.error(`Failed to get abuse reports: ${error.message}`);
      return [];
    }
  }

  async clearAbuseReports(userId: string, tenantId: string): Promise<void> {
    const key = `${this.keyPrefix}:reports:${tenantId}:${userId}`;
    try {
      await this.redisClient.del(key);
      logger.info(`Cleared abuse reports for user ${userId} in tenant ${tenantId}`);
    } catch (error: any) {
      logger.error(`Failed to clear abuse reports: ${error.message}`);
    }
  }

  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }
}