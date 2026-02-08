/**
 * Session Serializer
 * Phase 2 - Authentication - Task AUTH-005
 *
 * Serializes and deserializes session data for Redis storage
 */
import { Session } from './types';
export declare class SessionSerializer {
    /**
     * Serialize session to JSON string
     */
    static serialize(session: Session): string;
    /**
     * Deserialize session from JSON string
     */
    static deserialize(data: string): Session;
    /**
     * Validate and normalize session data
     */
    private static validateAndNormalize;
    /**
     * Normalize timestamp (handle both seconds and milliseconds)
     */
    private static normalizeTimestamp;
    /**
     * Create session snapshot for logging
     */
    static createSnapshot(session: Session): Record<string, any>;
    /**
     * Mask IP address for privacy
     */
    private static maskIpAddress;
}
