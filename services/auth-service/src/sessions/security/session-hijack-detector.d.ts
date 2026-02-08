/**
 * Session Hijack Detector
 * Phase 2 - Authentication - Task AUTH-008
 *
 * Detects potential session hijacking attempts
 */
import { Session } from '../types';
import { SecurityEvent } from './types';
export declare class SessionHijackDetector {
    /**
     * Detect potential session hijacking
     */
    detect(session: Session, currentIp: string, currentUserAgent: string): SecurityEvent | null;
    /**
     * Determine action based on detection
     */
    determineAction(event: SecurityEvent | null): 'allow' | 'challenge' | 'terminate';
    private maskIp;
}
