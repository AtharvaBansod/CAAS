/**
 * Scheduled Key Rotation
 * Automated rotation based on schedules
 */

import { RotationSchedule } from './types';

export class ScheduledRotation {
  private schedules: Map<string, RotationSchedule> = new Map();
  private rotationTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeDefaultSchedules();
  }

  /**
   * Initialize default rotation schedules
   */
  private initializeDefaultSchedules(): void {
    // Signed pre-keys: Weekly
    this.schedules.set('signed_pre_key', {
      key_type: 'signed_pre_key',
      interval_days: 7,
      enabled: true,
    });

    // Session keys: Daily
    this.schedules.set('session', {
      key_type: 'session',
      interval_days: 1,
      enabled: true,
    });

    // Master keys: Quarterly
    this.schedules.set('master', {
      key_type: 'master',
      interval_days: 90,
      enabled: false, // Manual only by default
    });
  }

  /**
   * Get rotation schedule for key type
   */
  getSchedule(keyType: string): RotationSchedule | null {
    return this.schedules.get(keyType) || null;
  }

  /**
   * Set rotation schedule
   */
  setSchedule(schedule: RotationSchedule): void {
    this.schedules.set(schedule.key_type, schedule);
  }

  /**
   * Check if rotation is due
   */
  isRotationDue(
    keyType: string,
    lastRotation: Date
  ): boolean {
    const schedule = this.schedules.get(keyType);
    if (!schedule || !schedule.enabled) {
      return false;
    }

    const daysSinceRotation = this.getDaysSince(lastRotation);
    return daysSinceRotation >= schedule.interval_days;
  }

  /**
   * Calculate next rotation date
   */
  getNextRotationDate(
    keyType: string,
    lastRotation: Date
  ): Date | null {
    const schedule = this.schedules.get(keyType);
    if (!schedule || !schedule.enabled) {
      return null;
    }

    const nextRotation = new Date(lastRotation);
    nextRotation.setDate(nextRotation.getDate() + schedule.interval_days);
    
    return nextRotation;
  }

  /**
   * Schedule rotation job
   */
  async scheduleRotation(
    keyType: string,
    userId: string,
    callback: () => Promise<void>
  ): Promise<void> {
    const schedule = this.schedules.get(keyType);
    if (!schedule || !schedule.enabled) {
      return;
    }

    const timerKey = `${keyType}:${userId}`;
    
    // Clear existing timer
    const existingTimer = this.rotationTimers.get(timerKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule next rotation
    const intervalMs = schedule.interval_days * 24 * 60 * 60 * 1000;
    const timer = setTimeout(async () => {
      try {
        await callback();
        // Reschedule
        await this.scheduleRotation(keyType, userId, callback);
      } catch (error) {
        console.error(`Scheduled rotation failed for ${keyType}:${userId}`, error);
      }
    }, intervalMs);

    this.rotationTimers.set(timerKey, timer);
  }

  /**
   * Cancel scheduled rotation
   */
  cancelRotation(keyType: string, userId: string): void {
    const timerKey = `${keyType}:${userId}`;
    const timer = this.rotationTimers.get(timerKey);
    
    if (timer) {
      clearTimeout(timer);
      this.rotationTimers.delete(timerKey);
    }
  }

  /**
   * Get all schedules
   */
  getAllSchedules(): RotationSchedule[] {
    return Array.from(this.schedules.values());
  }

  /**
   * Enable rotation for key type
   */
  enableRotation(keyType: string): void {
    const schedule = this.schedules.get(keyType);
    if (schedule) {
      schedule.enabled = true;
      this.schedules.set(keyType, schedule);
    }
  }

  /**
   * Disable rotation for key type
   */
  disableRotation(keyType: string): void {
    const schedule = this.schedules.get(keyType);
    if (schedule) {
      schedule.enabled = false;
      this.schedules.set(keyType, schedule);
    }
  }

  /**
   * Monitor rotation compliance
   */
  async checkCompliance(
    keyType: string,
    lastRotations: Map<string, Date>
  ): Promise<{
    compliant: number;
    overdue: number;
    overdue_users: string[];
  }> {
    const schedule = this.schedules.get(keyType);
    if (!schedule || !schedule.enabled) {
      return {
        compliant: lastRotations.size,
        overdue: 0,
        overdue_users: [],
      };
    }

    let compliant = 0;
    let overdue = 0;
    const overdueUsers: string[] = [];

    for (const [userId, lastRotation] of lastRotations.entries()) {
      if (this.isRotationDue(keyType, lastRotation)) {
        overdue++;
        overdueUsers.push(userId);
      } else {
        compliant++;
      }
    }

    return {
      compliant,
      overdue,
      overdue_users: overdueUsers,
    };
  }

  /**
   * Get days since date
   */
  private getDaysSince(date: Date): number {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Cleanup all timers
   */
  cleanup(): void {
    for (const timer of this.rotationTimers.values()) {
      clearTimeout(timer);
    }
    this.rotationTimers.clear();
  }
}

export const scheduledRotation = new ScheduledRotation();
