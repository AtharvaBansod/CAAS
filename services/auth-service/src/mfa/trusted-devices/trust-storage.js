"use strict";
/**
 * Trust Storage
 * Phase 2 - Authentication - Task AUTH-011
 *
 * Stores trusted device information
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryTrustStorage = void 0;
exports.createTrustStorage = createTrustStorage;
/**
 * In-memory implementation (replace with database in production)
 */
class InMemoryTrustStorage {
    storage = new Map();
    async trustDevice(userId, device) {
        const devices = this.storage.get(userId) || [];
        // Remove existing device with same ID
        const filtered = devices.filter(d => d.device_id !== device.device_id);
        filtered.push(device);
        this.storage.set(userId, filtered);
    }
    async getTrustedDevice(userId, deviceId) {
        const devices = this.storage.get(userId) || [];
        return devices.find(d => d.device_id === deviceId) || null;
    }
    async getTrustedDevices(userId) {
        return this.storage.get(userId) || [];
    }
    async removeTrust(userId, deviceId) {
        const devices = this.storage.get(userId) || [];
        const filtered = devices.filter(d => d.device_id !== deviceId);
        this.storage.set(userId, filtered);
    }
    async removeAllTrust(userId) {
        this.storage.delete(userId);
    }
    async updateLastUsed(userId, deviceId) {
        const device = await this.getTrustedDevice(userId, deviceId);
        if (device) {
            device.last_used = Date.now();
            await this.trustDevice(userId, device);
        }
    }
}
exports.InMemoryTrustStorage = InMemoryTrustStorage;
/**
 * Create trust storage instance
 */
function createTrustStorage() {
    // TODO: Replace with MongoDB implementation
    return new InMemoryTrustStorage();
}
//# sourceMappingURL=trust-storage.js.map