/**
 * Trust Storage
 * Phase 2 - Authentication - Task AUTH-011
 *
 * Stores trusted device information
 */
import { TrustedDevice } from '../types';
export interface TrustStorage {
    trustDevice(userId: string, device: TrustedDevice): Promise<void>;
    getTrustedDevice(userId: string, deviceId: string): Promise<TrustedDevice | null>;
    getTrustedDevices(userId: string): Promise<TrustedDevice[]>;
    removeTrust(userId: string, deviceId: string): Promise<void>;
    removeAllTrust(userId: string): Promise<void>;
    updateLastUsed(userId: string, deviceId: string): Promise<void>;
}
/**
 * In-memory implementation (replace with database in production)
 */
export declare class InMemoryTrustStorage implements TrustStorage {
    private storage;
    trustDevice(userId: string, device: TrustedDevice): Promise<void>;
    getTrustedDevice(userId: string, deviceId: string): Promise<TrustedDevice | null>;
    getTrustedDevices(userId: string): Promise<TrustedDevice[]>;
    removeTrust(userId: string, deviceId: string): Promise<void>;
    removeAllTrust(userId: string): Promise<void>;
    updateLastUsed(userId: string, deviceId: string): Promise<void>;
}
/**
 * Create trust storage instance
 */
export declare function createTrustStorage(): TrustStorage;
