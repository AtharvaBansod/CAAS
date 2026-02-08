/**
 * Anomaly Detector
 * Phase 2 - Authentication - Task AUTH-008
 *
 * Detects suspicious session activity
 */
import { Session } from '../types';
import { SecurityEvent, AnomalyDetectionConfig } from './types';
export declare class AnomalyDetector {
    private config;
    constructor(config: AnomalyDetectionConfig);
    /**
     * Detect anomalies in session activity
     */
    detectAnomalies(session: Session, previousSessions: Session[]): Promise<SecurityEvent[]>;
    /**
     * Detect impossible travel (login from two distant locations too quickly)
     */
    private detectImpossibleTravel;
    /**
     * Detect new device
     */
    private detectNewDevice;
    /**
     * Detect IP address change
     */
    private detectIpChange;
    /**
     * Calculate risk score (0-100)
     */
    calculateRiskScore(events: SecurityEvent[]): number;
    private maskIp;
}
