"use strict";
/**
 * Anomaly Detector
 * Phase 2 - Authentication - Task AUTH-008
 *
 * Detects suspicious session activity
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnomalyDetector = void 0;
class AnomalyDetector {
    config;
    constructor(config) {
        this.config = config;
    }
    /**
     * Detect anomalies in session activity
     */
    async detectAnomalies(session, previousSessions) {
        if (!this.config.enabled) {
            return [];
        }
        const events = [];
        // Check for impossible travel
        if (this.config.impossibleTravelEnabled) {
            const impossibleTravel = this.detectImpossibleTravel(session, previousSessions);
            if (impossibleTravel) {
                events.push(impossibleTravel);
            }
        }
        // Check for new device
        if (this.config.newDeviceAlertEnabled) {
            const newDevice = this.detectNewDevice(session, previousSessions);
            if (newDevice) {
                events.push(newDevice);
            }
        }
        // Check for IP change
        if (this.config.ipChangeAlertEnabled) {
            const ipChange = this.detectIpChange(session, previousSessions);
            if (ipChange) {
                events.push(ipChange);
            }
        }
        return events;
    }
    /**
     * Detect impossible travel (login from two distant locations too quickly)
     */
    detectImpossibleTravel(session, previousSessions) {
        if (!session.location || previousSessions.length === 0) {
            return null;
        }
        // Find most recent session with location
        const recentSession = previousSessions
            .filter(s => s.location)
            .sort((a, b) => b.created_at - a.created_at)[0];
        if (!recentSession || !recentSession.location) {
            return null;
        }
        // Check if countries are different
        if (session.location.country === recentSession.location.country) {
            return null;
        }
        // Check time difference
        const timeDiffHours = (session.created_at - recentSession.created_at) / (1000 * 60 * 60);
        // If less than 1 hour and different countries, flag as impossible travel
        if (timeDiffHours < 1) {
            return {
                type: 'impossible_travel',
                severity: 'critical',
                session_id: session.id,
                user_id: session.user_id,
                timestamp: Date.now(),
                details: {
                    previous_country: recentSession.location.country,
                    current_country: session.location.country,
                    time_diff_hours: timeDiffHours,
                },
            };
        }
        return null;
    }
    /**
     * Detect new device
     */
    detectNewDevice(session, previousSessions) {
        // Check if device ID has been seen before
        const knownDevice = previousSessions.some(s => s.device_id === session.device_id);
        if (!knownDevice) {
            return {
                type: 'new_device',
                severity: 'medium',
                session_id: session.id,
                user_id: session.user_id,
                timestamp: Date.now(),
                details: {
                    device_type: session.device_info.type,
                    os: session.device_info.os,
                    browser: session.device_info.browser,
                },
            };
        }
        return null;
    }
    /**
     * Detect IP address change
     */
    detectIpChange(session, previousSessions) {
        if (previousSessions.length === 0) {
            return null;
        }
        // Get most recent session
        const recentSession = previousSessions.sort((a, b) => b.created_at - a.created_at)[0];
        // Check if IP changed
        if (session.ip_address !== recentSession.ip_address) {
            return {
                type: 'ip_change',
                severity: 'low',
                session_id: session.id,
                user_id: session.user_id,
                timestamp: Date.now(),
                details: {
                    previous_ip: this.maskIp(recentSession.ip_address),
                    current_ip: this.maskIp(session.ip_address),
                },
            };
        }
        return null;
    }
    /**
     * Calculate risk score (0-100)
     */
    calculateRiskScore(events) {
        let score = 0;
        for (const event of events) {
            switch (event.severity) {
                case 'low':
                    score += 10;
                    break;
                case 'medium':
                    score += 25;
                    break;
                case 'high':
                    score += 50;
                    break;
                case 'critical':
                    score += 100;
                    break;
            }
        }
        return Math.min(100, score);
    }
    maskIp(ip) {
        const parts = ip.split('.');
        if (parts.length === 4) {
            return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
        }
        return 'xxx.xxx.xxx.xxx';
    }
}
exports.AnomalyDetector = AnomalyDetector;
//# sourceMappingURL=anomaly-detector.js.map