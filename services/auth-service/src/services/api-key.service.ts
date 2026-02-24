/**
 * API Key Service
 * Phase 4.5.z.x - Task 01: Auth Service Internal API Enhancement
 * 
 * Handles API key generation, validation, rotation, and revocation
 */

import { ClientRepository, Client } from '../repositories/client.repository';
import { RedisConnection } from '../storage/redis-connection';
import crypto from 'crypto';

export interface ApiKeyValidationResult {
    valid: boolean;
    client?: {
        client_id: string;
        tenant_id: string;
        plan: string;
        permissions: string[];
        rate_limit_tier: string;
    };
    error?: string;
}

export class ApiKeyService {
    private clientRepository: ClientRepository;
    private readonly CACHE_PREFIX = 'apikey-validation:';
    private readonly CACHE_TTL = 300; // 5 minutes

    constructor() {
        this.clientRepository = new ClientRepository();
    }

    /**
     * Generate a new API key pair (primary + secondary) for a client
     */
    async generateApiKeyPair(client_id: string): Promise<{
        primary_key: string;
        secondary_key: string;
    }> {
        const client = await this.clientRepository.findById(client_id);
        if (!client) {
            throw new Error('Client not found');
        }

        const primaryKey = ClientRepository.generateApiKey();
        const secondaryKey = ClientRepository.generateApiKey();

        const now = new Date();

        await this.clientRepository.updateApiKeys(client_id, {
            primary: {
                key_hash: ClientRepository.hashApiKey(primaryKey),
                key_prefix: primaryKey.substring(0, 12),
                created_at: now,
                last_used: null,
                revoked: false,
            },
            secondary: {
                key_hash: ClientRepository.hashApiKey(secondaryKey),
                key_prefix: secondaryKey.substring(0, 12),
                created_at: now,
                last_used: null,
                revoked: false,
            },
        });

        return {
            primary_key: primaryKey,
            secondary_key: secondaryKey,
        };
    }

    /**
     * Validate an API key and optionally check IP whitelist
     */
    async validateApiKey(apiKey: string, ipAddress?: string): Promise<ApiKeyValidationResult> {
        const redis = RedisConnection.getClient();
        const keyHash = ClientRepository.hashApiKey(apiKey);

        // Check Redis cache first
        const cacheKey = `${this.CACHE_PREFIX}${keyHash}`;
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                const result = JSON.parse(cached) as ApiKeyValidationResult;
                // Still need to check IP even if cached
                if (result.valid && ipAddress && result.client) {
                    const client = await this.clientRepository.findById(result.client.client_id);
                    if (client && !this.isIpAllowed(ipAddress, client.ip_whitelist)) {
                        return { valid: false, error: 'IP address not whitelisted' };
                    }
                }
                return result;
            }
        } catch {
            // Cache miss or error, continue to DB lookup
        }

        // Lookup in MongoDB
        const client = await this.clientRepository.findByApiKeyHash(keyHash);

        if (!client) {
            const result: ApiKeyValidationResult = { valid: false, error: 'Invalid API key' };
            // Cache negative result for shorter period
            try { await redis.setex(cacheKey, 60, JSON.stringify(result)); } catch { }
            return result;
        }

        if (client.status !== 'active') {
            return { valid: false, error: 'Client account is suspended or deleted' };
        }

        // Check IP whitelist
        if (ipAddress && !this.isIpAllowed(ipAddress, client.ip_whitelist)) {
            return { valid: false, error: 'IP address not whitelisted' };
        }

        // Determine which key type was used and update last_used
        const keyType = client.api_keys.primary?.key_hash === keyHash ? 'primary' : 'secondary';
        // Fire-and-forget the last_used update
        this.clientRepository.updateApiKeyLastUsed(client.client_id, keyType).catch(() => { });

        const permissions = this.getPermissionsForPlan(client.plan);
        const rateLimitTier = this.getRateLimitTier(client.plan);

        const result: ApiKeyValidationResult = {
            valid: true,
            client: {
                client_id: client.client_id,
                tenant_id: client.tenant_id,
                plan: client.plan,
                permissions,
                rate_limit_tier: rateLimitTier,
            },
        };

        // Cache the result
        try { await redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(result)); } catch { }

        return result;
    }

    /**
     * Rotate API key - generate new secondary key
     */
    async rotateApiKey(client_id: string): Promise<{ secondary_key: string }> {
        const client = await this.clientRepository.findById(client_id);
        if (!client) {
            throw new Error('Client not found');
        }

        const newSecondaryKey = ClientRepository.generateApiKey();
        const now = new Date();

        // Invalidate old secondary key cache if exists
        if (client.api_keys.secondary?.key_hash) {
            const redis = RedisConnection.getClient();
            await redis.del(`${this.CACHE_PREFIX}${client.api_keys.secondary.key_hash}`);
        }

        await this.clientRepository.updateApiKeys(client_id, {
            primary: client.api_keys.primary,
            secondary: {
                key_hash: ClientRepository.hashApiKey(newSecondaryKey),
                key_prefix: newSecondaryKey.substring(0, 12),
                created_at: now,
                last_used: null,
                revoked: false,
            },
        });

        return { secondary_key: newSecondaryKey };
    }

    /**
     * Promote secondary key to primary, revoke old primary
     */
    async promoteSecondaryKey(client_id: string): Promise<void> {
        const client = await this.clientRepository.findById(client_id);
        if (!client) {
            throw new Error('Client not found');
        }

        if (!client.api_keys.secondary) {
            throw new Error('No secondary key to promote');
        }

        const redis = RedisConnection.getClient();

        // Invalidate old primary key cache
        if (client.api_keys.primary?.key_hash) {
            await redis.del(`${this.CACHE_PREFIX}${client.api_keys.primary.key_hash}`);
        }

        await this.clientRepository.updateApiKeys(client_id, {
            primary: {
                ...client.api_keys.secondary,
                revoked: false,
            },
            secondary: null,
        });
    }

    /**
     * Revoke a specific API key
     */
    async revokeApiKey(client_id: string, keyType: 'primary' | 'secondary'): Promise<void> {
        const client = await this.clientRepository.findById(client_id);
        if (!client) {
            throw new Error('Client not found');
        }

        const key = client.api_keys[keyType];
        if (!key) {
            throw new Error(`No ${keyType} key found`);
        }

        // Invalidate cache
        const redis = RedisConnection.getClient();
        await redis.del(`${this.CACHE_PREFIX}${key.key_hash}`);

        const updatedKeys = { ...client.api_keys };
        updatedKeys[keyType] = {
            ...key,
            revoked: true,
        };

        await this.clientRepository.updateApiKeys(client_id, updatedKeys);
    }

    /**
     * Check if an IP address is allowed by the whitelist
     * Supports CIDR notation and individual IPs
     * If whitelist is empty, all IPs are allowed (development mode)
     */
    private isIpAllowed(ip: string, whitelist: string[]): boolean {
        if (!whitelist || whitelist.length === 0) {
            return true; // No whitelist = allow all (dev mode)
        }

        for (const entry of whitelist) {
            if (entry.includes('/')) {
                // CIDR notation
                if (this.isIpInCidr(ip, entry)) return true;
            } else {
                // Exact match
                if (ip === entry) return true;
            }
        }

        return false;
    }

    /**
     * Check if IP is within CIDR range (basic IPv4 implementation)
     */
    private isIpInCidr(ip: string, cidr: string): boolean {
        try {
            const [range, bits] = cidr.split('/');
            const mask = ~(Math.pow(2, 32 - parseInt(bits)) - 1);
            const ipNum = this.ipToNumber(ip);
            const rangeNum = this.ipToNumber(range);
            return (ipNum & mask) === (rangeNum & mask);
        } catch {
            return false;
        }
    }

    private ipToNumber(ip: string): number {
        return ip.split('.').reduce((sum, octet) => (sum << 8) + parseInt(octet), 0) >>> 0;
    }

    private getPermissionsForPlan(plan: string): string[] {
        const basePermissions = [
            'sdk:session:create',
            'sdk:session:refresh',
            'sdk:session:logout',
            'user:read',
            'user:write',
            'conversation:read',
            'conversation:write',
            'message:read',
            'message:write',
        ];

        if (plan === 'business' || plan === 'enterprise') {
            basePermissions.push(
                'media:upload',
                'media:download',
                'search:query',
                'analytics:read'
            );
        }

        if (plan === 'enterprise') {
            basePermissions.push(
                'admin:read',
                'admin:write',
                'webhook:manage',
                'audit:read'
            );
        }

        return basePermissions;
    }

    private getRateLimitTier(plan: string): string {
        switch (plan) {
            case 'enterprise': return 'enterprise';
            case 'business': return 'business';
            default: return 'free';
        }
    }
}
