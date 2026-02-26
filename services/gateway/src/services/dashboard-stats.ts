/**
 * Dashboard Statistics Service
 * 
 * Queries MongoDB for real-time dashboard metrics
 */

import { Db, MongoClient } from 'mongodb';

export interface DashboardStats {
  active_users: number;
  messages_today: number;
  api_calls: number;
  active_connections: number;
}

export interface RecentActivity {
  action: string;
  timestamp: string;
  details?: string;
}

export class DashboardStatsService {
  private db: Db | null = null;
  private analyticsDb: Db | null = null;

  constructor(private mongoClient: MongoClient) {
    this.db = mongoClient.db('caas_platform');
    this.analyticsDb = mongoClient.db('caas_analytics');
  }

  /**
   * Get dashboard statistics for a tenant
   */
  async getStats(tenantId: string): Promise<DashboardStats> {
    try {
      const [activeUsers, messagesToday, apiCalls] = await Promise.all([
        this.countActiveUsers(tenantId),
        this.countMessagesToday(tenantId),
        this.countApiCallsToday(tenantId),
      ]);

      // Active connections from Redis would be better, but for now use a calculation
      const activeConnections = await this.estimateActiveConnections(tenantId);

      return {
        active_users: activeUsers,
        messages_today: messagesToday,
        api_calls: apiCalls,
        active_connections: activeConnections,
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      // Return zeros on error rather than failing
      return {
        active_users: 0,
        messages_today: 0,
        api_calls: 0,
        active_connections: 0,
      };
    }
  }

  /**
   * Count active users (users with activity in last 24 hours)
   */
  private async countActiveUsers(tenantId: string): Promise<number> {
    try {
      // Get tenant's database name from clients
      const client = await this.db!.collection('clients').findOne(
        { tenant_id: tenantId },
        { projection: { isolation: 1 } }
      );

      if (!client) {
        return 0;
      }

      // Determine which database to query
      const tenantDb = (client as any).isolation?.database_name
        ? this.mongoClient.db((client as any).isolation.database_name)
        : this.mongoClient.db(`caas_tenant_${tenantId}`);

      // Count users with messages in last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const activeUserIds = await tenantDb.collection('messages').distinct(
        'sender.user_id',
        {
          tenant_id: tenantId,
          created_at: { $gte: oneDayAgo },
          'deletion.is_deleted': { $ne: true },
        }
      );

      return activeUserIds.length;
    } catch (error) {
      console.error('Error counting active users:', error);
      return 0;
    }
  }

  /**
   * Count messages sent today
   */
  private async countMessagesToday(tenantId: string): Promise<number> {
    try {
      const client = await this.db!.collection('clients').findOne(
        { tenant_id: tenantId },
        { projection: { isolation: 1 } }
      );

      if (!client) {
        return 0;
      }

      const tenantDb = (client as any).isolation?.database_name
        ? this.mongoClient.db((client as any).isolation.database_name)
        : this.mongoClient.db(`caas_tenant_${tenantId}`);

      // Get start of today (UTC)
      const startOfToday = new Date();
      startOfToday.setUTCHours(0, 0, 0, 0);

      const count = await tenantDb.collection('messages').countDocuments({
        tenant_id: tenantId,
        created_at: { $gte: startOfToday },
        'deletion.is_deleted': { $ne: true },
      });

      return count;
    } catch (error) {
      console.error('Error counting messages today:', error);
      return 0;
    }
  }

  /**
   * Count API calls today from audit logs
   */
  private async countApiCallsToday(tenantId: string): Promise<number> {
    try {
      const startOfToday = new Date();
      startOfToday.setUTCHours(0, 0, 0, 0);

      const count = await this.analyticsDb!.collection('audit_logs').countDocuments({
        tenant_id: tenantId,
        created_at: { $gte: startOfToday },
      });

      return count;
    } catch (error) {
      console.error('Error counting API calls:', error);
      return 0;
    }
  }

  /**
   * Estimate active connections
   * TODO: Replace with Redis query for real-time socket connections
   */
  private async estimateActiveConnections(tenantId: string): Promise<number> {
    try {
      // For now, estimate as 10% of active users
      // In production, query Redis for actual socket connections
      const activeUsers = await this.countActiveUsers(tenantId);
      return Math.floor(activeUsers * 0.1);
    } catch (error) {
      console.error('Error estimating connections:', error);
      return 0;
    }
  }

  /**
   * Get recent activity from audit logs
   */
  async getRecentActivity(tenantId: string, limit: number = 5): Promise<RecentActivity[]> {
    try {
      const logs = await this.analyticsDb!.collection('audit_logs')
        .find({
          tenant_id: tenantId,
        })
        .sort({ created_at: -1 })
        .limit(limit)
        .toArray();

      return logs.map((log: any) => ({
        action: this.formatActionName(log.action || 'unknown'),
        timestamp: log.created_at?.toISOString() || new Date().toISOString(),
        details: this.formatActionDetails(log),
      }));
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  }

  /**
   * Format action name for display
   */
  private formatActionName(actionName: string): string {
    const actionMap: Record<string, string> = {
      'api_key.rotated': 'API key rotated',
      'api_key.created': 'API key created',
      'api_key.revoked': 'API key revoked',
      'user.created': 'New user registered',
      'user.updated': 'User profile updated',
      'settings.updated': 'Settings updated',
      'webhook.configured': 'Webhook configured',
      'ip_whitelist.added': 'IP added to whitelist',
      'ip_whitelist.removed': 'IP removed from whitelist',
      'origin_whitelist.added': 'Origin added to whitelist',
      'origin_whitelist.removed': 'Origin removed from whitelist',
      'login': 'User logged in',
      'logout': 'User logged out',
    };

    return actionMap[actionName] || actionName.replace(/[._]/g, ' ');
  }

  /**
   * Format action details for display
   */
  private formatActionDetails(log: any): string {
    const actionName = log.action?.name || '';
    const target = log.target?.identifier || '';

    if (actionName.includes('api_key')) {
      return target || 'API key';
    }

    if (actionName.includes('user')) {
      return log.actor?.email || target || 'User';
    }

    if (actionName.includes('ip_whitelist')) {
      return target || 'IP address';
    }

    if (actionName.includes('origin_whitelist')) {
      return target || 'Origin';
    }

    if (actionName.includes('webhook')) {
      return target || 'Webhook endpoint';
    }

    if (actionName.includes('settings')) {
      const fields = log.changes?.fields_changed?.join(', ') || 'settings';
      return `Updated ${fields}`;
    }

    return target || '';
  }
}
