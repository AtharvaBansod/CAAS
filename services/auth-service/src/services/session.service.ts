/**
 * Session Service
 * Phase 4.5.0 - Task 05: Refactored to use SessionRepository
 */

import { SessionRepository } from '../repositories/session.repository';
import { config } from '../config/config';

export class SessionService {
  private sessionRepository: SessionRepository;

  constructor() {
    this.sessionRepository = new SessionRepository();
  }

  async createSession(data: any) {
    const session = await this.sessionRepository.createSession({
      user_id: data.user_id,
      tenant_id: data.tenant_id,
      device_fingerprint: data.device_info?.fingerprint,
      ip_address: data.ip_address,
      user_agent: data.user_agent,
      location: data.location,
      expires_at: new Date(Date.now() + config.session.ttl * 1000),
    });

    return session;
  }

  async createPendingSession(data: any) {
    const session = await this.sessionRepository.createSession({
      user_id: data.user_id,
      tenant_id: data.tenant_id,
      device_fingerprint: data.device_info?.fingerprint,
      ip_address: data.ip_address,
      user_agent: data.user_agent,
      location: data.location,
      expires_at: new Date(Date.now() + config.session.ttl * 1000),
    });

    // Mark as inactive (pending)
    await this.sessionRepository.terminateSession(session.session_id);
    session.is_active = false;

    return session;
  }

  async activateSession(session_id: string) {
    // Reactivate by updating activity
    await this.sessionRepository.updateActivity(session_id);
  }

  async getSession(session_id: string) {
    return await this.sessionRepository.findById(session_id);
  }

  async getUserSessions(user_id: string) {
    return await this.sessionRepository.findByUserId(user_id, true);
  }

  async terminateSession(session_id: string) {
    await this.sessionRepository.terminateSession(session_id);
  }

  async terminateAllUserSessions(user_id: string) {
    await this.sessionRepository.terminateUserSessions(user_id);
  }

  async cleanupExpiredSessions() {
    return await this.sessionRepository.cleanupExpiredSessions();
  }
}
