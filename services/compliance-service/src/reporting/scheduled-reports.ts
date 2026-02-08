/**
 * Scheduled Reports
 * 
 * Cron-based scheduling for recurring compliance reports
 */

import { Db } from 'mongodb';
import { ComplianceReporter } from './compliance-reporter';
import { ReportType, ReportOptions } from './types';

export interface ReportSchedule {
  _id?: string;
  tenant_id: string;
  report_type: ReportType;
  schedule: string; // Cron expression
  format: 'pdf' | 'csv' | 'json' | 'html';
  recipients: string[]; // Email addresses
  is_active: boolean;
  last_run?: Date;
  next_run?: Date;
  created_at: Date;
  created_by: string;
}

export interface ScheduledReportExecution {
  schedule_id: string;
  report_id: string;
  executed_at: Date;
  status: 'success' | 'failed';
  error?: string;
}

export class ScheduledReportsManager {
  private reporter: ComplianceReporter;
  private schedules: Map<string, ReportSchedule> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(private db: Db) {
    this.reporter = new ComplianceReporter(db);
  }

  /**
   * Initialize scheduled reports
   */
  async initialize(): Promise<void> {
    // Load active schedules from database
    const schedules = await this.db
      .collection('report_schedules')
      .find({ is_active: true })
      .toArray();

    for (const schedule of schedules) {
      await this.scheduleReport(schedule as ReportSchedule);
    }

    console.log(`Initialized ${schedules.length} scheduled reports`);
  }

  /**
   * Create report schedule
   */
  async createSchedule(schedule: Omit<ReportSchedule, '_id' | 'created_at'>): Promise<ReportSchedule> {
    // Validate cron expression
    if (!this.isValidCron(schedule.schedule)) {
      throw new Error('Invalid cron expression');
    }

    const newSchedule: ReportSchedule = {
      ...schedule,
      created_at: new Date(),
      next_run: this.calculateNextRun(schedule.schedule),
    };

    const result = await this.db.collection('report_schedules').insertOne(newSchedule as any);
    newSchedule._id = result.insertedId.toString();

    // Schedule the report
    if (newSchedule.is_active) {
      await this.scheduleReport(newSchedule);
    }

    return newSchedule;
  }

  /**
   * Update report schedule
   */
  async updateSchedule(
    scheduleId: string,
    updates: Partial<ReportSchedule>
  ): Promise<ReportSchedule> {
    const existing = await this.getSchedule(scheduleId);
    if (!existing) {
      throw new Error(`Schedule not found: ${scheduleId}`);
    }

    // Validate cron if updated
    if (updates.schedule && !this.isValidCron(updates.schedule)) {
      throw new Error('Invalid cron expression');
    }

    const updated = {
      ...existing,
      ...updates,
    };

    if (updates.schedule) {
      updated.next_run = this.calculateNextRun(updates.schedule);
    }

    await this.db.collection('report_schedules').updateOne(
      { _id: scheduleId } as any,
      { $set: updated }
    );

    // Reschedule if active
    this.cancelSchedule(scheduleId);
    if (updated.is_active) {
      await this.scheduleReport(updated);
    }

    return updated;
  }

  /**
   * Delete report schedule
   */
  async deleteSchedule(scheduleId: string): Promise<boolean> {
    this.cancelSchedule(scheduleId);
    
    const result = await this.db
      .collection('report_schedules')
      .deleteOne({ _id: scheduleId } as any);
    
    return (result.deletedCount || 0) > 0;
  }

  /**
   * Get schedule by ID
   */
  async getSchedule(scheduleId: string): Promise<ReportSchedule | null> {
    return await this.db
      .collection('report_schedules')
      .findOne({ _id: scheduleId } as any);
  }

  /**
   * List schedules
   */
  async listSchedules(tenantId?: string): Promise<ReportSchedule[]> {
    const query = tenantId ? { tenant_id: tenantId } : {};
    return await this.db
      .collection('report_schedules')
      .find(query)
      .sort({ created_at: -1 })
      .toArray();
  }

  /**
   * Schedule report execution
   */
  private async scheduleReport(schedule: ReportSchedule): Promise<void> {
    if (!schedule._id) {
      return;
    }

    this.schedules.set(schedule._id, schedule);

    // Calculate delay until next run
    const now = new Date();
    const nextRun = schedule.next_run || this.calculateNextRun(schedule.schedule);
    const delay = nextRun.getTime() - now.getTime();

    if (delay <= 0) {
      // Run immediately if overdue
      await this.executeScheduledReport(schedule._id);
    } else {
      // Schedule for future execution
      const timer = setTimeout(() => {
        this.executeScheduledReport(schedule._id!);
      }, delay);

      this.timers.set(schedule._id, timer);
    }
  }

  /**
   * Cancel scheduled report
   */
  private cancelSchedule(scheduleId: string): void {
    const timer = this.timers.get(scheduleId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(scheduleId);
    }
    this.schedules.delete(scheduleId);
  }

  /**
   * Execute scheduled report
   */
  private async executeScheduledReport(scheduleId: string): Promise<void> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      return;
    }

    const execution: ScheduledReportExecution = {
      schedule_id: scheduleId,
      report_id: '',
      executed_at: new Date(),
      status: 'success',
    };

    try {
      // Generate report
      const options: ReportOptions = {
        tenant_id: schedule.tenant_id,
        start_date: this.getReportStartDate(schedule.schedule),
        end_date: new Date(),
        format: schedule.format,
      };

      const report = await this.reporter.generateReport(
        schedule.report_type,
        options,
        'scheduled'
      );

      execution.report_id = report._id!;

      // Send to recipients
      if (schedule.recipients.length > 0) {
        await this.sendReport(report, schedule.recipients);
      }

      // Update last run
      await this.db.collection('report_schedules').updateOne(
        { _id: scheduleId } as any,
        {
          $set: {
            last_run: new Date(),
            next_run: this.calculateNextRun(schedule.schedule),
          },
        }
      );

      // Reschedule for next run
      schedule.last_run = new Date();
      schedule.next_run = this.calculateNextRun(schedule.schedule);
      await this.scheduleReport(schedule);
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to execute scheduled report ${scheduleId}:`, error);
    }

    // Store execution record
    await this.db.collection('scheduled_report_executions').insertOne(execution);
  }

  /**
   * Send report to recipients
   */
  private async sendReport(report: any, recipients: string[]): Promise<void> {
    // TODO: Integrate with email service
    console.log(`Sending report ${report._id} to ${recipients.join(', ')}`);
    
    // In production:
    // - Generate email with report attachment
    // - Use email service (SendGrid, SES, etc.)
    // - Include download link
  }

  /**
   * Validate cron expression
   */
  private isValidCron(expression: string): boolean {
    // Basic validation - in production use a proper cron parser
    const parts = expression.split(' ');
    return parts.length === 5 || parts.length === 6;
  }

  /**
   * Calculate next run time from cron expression
   */
  private calculateNextRun(cronExpression: string): Date {
    // TODO: Implement proper cron parsing
    // For now, use simple logic based on common patterns
    
    const now = new Date();
    
    // Daily at midnight
    if (cronExpression === '0 0 * * *') {
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(0, 0, 0, 0);
      return next;
    }
    
    // Weekly on Monday
    if (cronExpression === '0 0 * * 1') {
      const next = new Date(now);
      const daysUntilMonday = (8 - next.getDay()) % 7 || 7;
      next.setDate(next.getDate() + daysUntilMonday);
      next.setHours(0, 0, 0, 0);
      return next;
    }
    
    // Monthly on 1st
    if (cronExpression === '0 0 1 * *') {
      const next = new Date(now);
      next.setMonth(next.getMonth() + 1);
      next.setDate(1);
      next.setHours(0, 0, 0, 0);
      return next;
    }
    
    // Default: 1 hour from now
    const next = new Date(now);
    next.setHours(next.getHours() + 1);
    return next;
  }

  /**
   * Get report start date based on schedule
   */
  private getReportStartDate(cronExpression: string): Date {
    const now = new Date();
    
    // Daily reports: start from yesterday
    if (cronExpression === '0 0 * * *') {
      const start = new Date(now);
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    
    // Weekly reports: start from last week
    if (cronExpression === '0 0 * * 1') {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    
    // Monthly reports: start from last month
    if (cronExpression === '0 0 1 * *') {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    
    // Default: last 24 hours
    const start = new Date(now);
    start.setHours(start.getHours() - 24);
    return start;
  }

  /**
   * Shutdown and cleanup
   */
  async shutdown(): Promise<void> {
    // Cancel all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.schedules.clear();
  }
}
