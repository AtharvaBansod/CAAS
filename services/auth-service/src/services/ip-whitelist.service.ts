/**
 * IP Whitelist Service
 * Phase 4.5.z.x - Task 01: Auth Service Internal API Enhancement
 * 
 * Manages IP whitelist entries for SAAS clients
 */

import { ClientRepository } from '../repositories/client.repository';
import { RedisConnection } from '../storage/redis-connection';
import net from 'net';

export class IpWhitelistService {
    private clientRepository: ClientRepository;

    constructor() {
        this.clientRepository = new ClientRepository();
    }

    /**
     * Get IP whitelist for a client
     */
    async getWhitelist(client_id: string): Promise<string[]> {
        const client = await this.clientRepository.findById(client_id);
        if (!client) {
            throw new Error('Client not found');
        }
        return client.ip_whitelist || [];
    }

    /**
     * Add IP to whitelist
     */
    async addIp(client_id: string, ip: string): Promise<void> {
        // Validate IP format
        if (!this.isValidIpOrCidr(ip)) {
            throw new Error('Invalid IP address or CIDR notation');
        }

        const client = await this.clientRepository.findById(client_id);
        if (!client) {
            throw new Error('Client not found');
        }

        // Check for duplicates
        if (client.ip_whitelist.includes(ip)) {
            throw new Error('IP already in whitelist');
        }

        const updatedList = [...client.ip_whitelist, ip];
        await this.clientRepository.updateIpWhitelist(client_id, updatedList);

        // Invalidate related caches
        await this.invalidateApiKeyCaches(client);
    }

    /**
     * Remove IP from whitelist
     */
    async removeIp(client_id: string, ip: string): Promise<void> {
        const client = await this.clientRepository.findById(client_id);
        if (!client) {
            throw new Error('Client not found');
        }

        const decodedIp = decodeURIComponent(ip);
        const updatedList = client.ip_whitelist.filter(entry => entry !== decodedIp);

        if (updatedList.length === client.ip_whitelist.length) {
            throw new Error('IP not found in whitelist');
        }

        await this.clientRepository.updateIpWhitelist(client_id, updatedList);

        // Invalidate related caches
        await this.invalidateApiKeyCaches(client);
    }

    /**
     * Validate IP format (IPv4, IPv6, or CIDR)
     */
    private isValidIpOrCidr(input: string): boolean {
        // Check CIDR notation
        if (input.includes('/')) {
            const [ip, bits] = input.split('/');
            const bitNum = parseInt(bits);

            if (net.isIPv4(ip)) {
                return bitNum >= 0 && bitNum <= 32;
            }
            if (net.isIPv6(ip)) {
                return bitNum >= 0 && bitNum <= 128;
            }
            return false;
        }

        // Plain IP
        return net.isIPv4(input) || net.isIPv6(input);
    }

    /**
     * Invalidate Redis caches when whitelist changes
     */
    private async invalidateApiKeyCaches(client: any): Promise<void> {
        try {
            const redis = RedisConnection.getClient();
            if (client.api_keys.primary?.key_hash) {
                await redis.del(`apikey-validation:${client.api_keys.primary.key_hash}`);
            }
            if (client.api_keys.secondary?.key_hash) {
                await redis.del(`apikey-validation:${client.api_keys.secondary.key_hash}`);
            }
        } catch {
            // Ignore cache errors
        }
    }
}
