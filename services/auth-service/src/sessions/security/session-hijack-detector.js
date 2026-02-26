"use strict";
/**
 * Session Hijack Detector
 * Phase 2 - Authentication - Task AUTH-008
 *
 * Detects potential session hijacking attempts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionHijackDetector = void 0;
class SessionHijackDetector {
    /**
     * Detect potential session hijacking
     */
    detect(session, currentIp, currentUserAgent) {
        const events = [];
        // Check for IP change mid-session
        if (session.ip_address !== currentIp) {
            events.push({
                type: 'ip_change',
                severity: 'high',
                session_id: session.id,
                user_id: session.user_id,
                timestamp: Date.now(),
                details: {
                    original_ip: this.maskIp(session.ip_address),
                    current_ip: this.maskIp(currentIp),
                    session_age_hours: (Date.now() - session.created_at) / (1000 * 60 * 60),
                },
            });
        }
        // Check for User-Agent change
        if (session.device_info.user_agent !== currentUserAgent) {
            events.push({
                type: 'device_change',
                severity: 'critical',
                session_id: session.id,
                user_id: session.user_id,
                timestamp: Date.now(),
                details: {
                    original_user_agent: session.device_info.user_agent,
                    current_user_agent: currentUserAgent,
                },
            });
        }
        // If multiple indicators, flag as potential hijack
        if (events.length >= 2) {
            return {
                type: 'session_hijack',
                severity: 'critical',
                session_id: session.id,
                user_id: session.user_id,
                timestamp: Date.now(),
                details: {
                    indicators: events.map(e => e.type),
                    confidence: 'high',
                },
            };
        }
        // Return first event if any
        return events[0] || null;
    }
    /**
     * Determine action based on detection
     */
    determineAction(event) {
        if (!event) {
            return 'allow';
        }
        switch (event.type) {
            case 'session_hijack':
                return 'terminate';
            case 'device_change':
                return 'terminate';
            case 'ip_change':
                return event.severity === 'critical' ? 'terminate' : 'challenge';
            default:
                return 'allow';
        }
    }
    maskIp(ip) {
        const parts = ip.split('.');
        if (parts.length === 4) {
            return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
        }
        return 'xxx.xxx.xxx.xxx';
    }
}
exports.SessionHijackDetector = SessionHijackDetector;
//# sourceMappingURL=session-hijack-detector.js.map
