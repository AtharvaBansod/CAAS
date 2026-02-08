/**
 * Session Store
 * Manages Signal Protocol session state
 */

import { Session, SessionRecord, RatchetState } from './types';
import { randomBytes } from 'crypto';

export class SessionStore {
  private sessions: Map<string, Session> = new Map();

  /**
   * Store session
   */
  async storeSession(session: Session): Promise<void> {
    const key = this.makeKey(
      session.user_id,
      session.recipient_id,
      session.device_id
    );
    this.sessions.set(key, session);
  }

  /**
   * Load session
   */
  async loadSession(
    userId: string,
    recipientId: string,
    deviceId: number
  ): Promise<Session | null> {
    const key = this.makeKey(userId, recipientId, deviceId);
    return this.sessions.get(key) || null;
  }

  /**
   * Check if session exists
   */
  async hasSession(
    userId: string,
    recipientId: string,
    deviceId: number
  ): Promise<boolean> {
    const key = this.makeKey(userId, recipientId, deviceId);
    return this.sessions.has(key);
  }

  /**
   * Delete session
   */
  async deleteSession(
    userId: string,
    recipientId: string,
    deviceId: number
  ): Promise<void> {
    const key = this.makeKey(userId, recipientId, deviceId);
    this.sessions.delete(key);
  }

  /**
   * Get all sessions for user
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    const userSessions: Session[] = [];

    for (const session of this.sessions.values()) {
      if (session.user_id === userId) {
        userSessions.push(session);
      }
    }

    return userSessions;
  }

  /**
   * Get all sessions with recipient
   */
  async getRecipientSessions(
    userId: string,
    recipientId: string
  ): Promise<Session[]> {
    const recipientSessions: Session[] = [];

    for (const session of this.sessions.values()) {
      if (
        session.user_id === userId &&
        session.recipient_id === recipientId
      ) {
        recipientSessions.push(session);
      }
    }

    return recipientSessions;
  }

  /**
   * Create new session
   */
  async createSession(
    userId: string,
    recipientId: string,
    deviceId: number,
    rootKey: Buffer
  ): Promise<Session> {
    const session: Session = {
      session_id: randomBytes(16).toString('hex'),
      user_id: userId,
      recipient_id: recipientId,
      device_id: deviceId,
      root_key: rootKey,
      sending_chain: {
        chain_key: Buffer.alloc(32),
        message_number: 0,
      },
      receiving_chains: new Map(),
      previous_counter: 0,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await this.storeSession(session);
    return session;
  }

  /**
   * Update session
   */
  async updateSession(session: Session): Promise<void> {
    session.updated_at = new Date();
    await this.storeSession(session);
  }

  /**
   * Serialize session for storage
   */
  serializeSession(session: Session): Buffer {
    const data = {
      session_id: session.session_id,
      user_id: session.user_id,
      recipient_id: session.recipient_id,
      device_id: session.device_id,
      root_key: session.root_key.toString('base64'),
      sending_chain: {
        chain_key: session.sending_chain.chain_key.toString('base64'),
        message_number: session.sending_chain.message_number,
        public_key: session.sending_chain.public_key?.toString('base64'),
      },
      receiving_chains: Array.from(session.receiving_chains.entries()).map(
        ([key, chain]) => ({
          key,
          chain_key: chain.chain_key.toString('base64'),
          message_number: chain.message_number,
          public_key: chain.public_key?.toString('base64'),
        })
      ),
      previous_counter: session.previous_counter,
      created_at: session.created_at.toISOString(),
      updated_at: session.updated_at.toISOString(),
    };

    return Buffer.from(JSON.stringify(data));
  }

  /**
   * Deserialize session from storage
   */
  deserializeSession(data: Buffer): Session {
    const parsed = JSON.parse(data.toString());

    return {
      session_id: parsed.session_id,
      user_id: parsed.user_id,
      recipient_id: parsed.recipient_id,
      device_id: parsed.device_id,
      root_key: Buffer.from(parsed.root_key, 'base64'),
      sending_chain: {
        chain_key: Buffer.from(parsed.sending_chain.chain_key, 'base64'),
        message_number: parsed.sending_chain.message_number,
        public_key: parsed.sending_chain.public_key
          ? Buffer.from(parsed.sending_chain.public_key, 'base64')
          : undefined,
      },
      receiving_chains: new Map(
        parsed.receiving_chains.map((chain: any) => [
          chain.key,
          {
            chain_key: Buffer.from(chain.chain_key, 'base64'),
            message_number: chain.message_number,
            public_key: chain.public_key
              ? Buffer.from(chain.public_key, 'base64')
              : undefined,
          },
        ])
      ),
      previous_counter: parsed.previous_counter,
      created_at: new Date(parsed.created_at),
      updated_at: new Date(parsed.updated_at),
    };
  }

  /**
   * Cleanup old sessions
   */
  async cleanupOldSessions(daysOld: number = 90): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    let count = 0;
    for (const [key, session] of this.sessions.entries()) {
      if (session.updated_at < cutoff) {
        this.sessions.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Make storage key
   */
  private makeKey(
    userId: string,
    recipientId: string,
    deviceId: number
  ): string {
    return `${userId}:${recipientId}:${deviceId}`;
  }
}

export const sessionStore = new SessionStore();
