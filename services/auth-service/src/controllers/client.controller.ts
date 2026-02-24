/**
 * Client Controller
 * Phase 4.5.z.x - Task 01: Auth Service Internal API Enhancement
 * 
 * Handles SAAS client management:
 * - Client registration
 * - API key management (rotate, promote, revoke)
 * - IP whitelist management
 * - Origin whitelist management
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { ClientRepository } from '../repositories/client.repository';
import { ApiKeyService } from '../services/api-key.service';
import { IpWhitelistService } from '../services/ip-whitelist.service';
import bcrypt from 'bcrypt';

export class ClientController {
    private clientRepository: ClientRepository;
    private apiKeyService: ApiKeyService;
    private ipWhitelistService: IpWhitelistService;

    constructor() {
        this.clientRepository = new ClientRepository();
        this.apiKeyService = new ApiKeyService();
        this.ipWhitelistService = new IpWhitelistService();
    }

    /**
     * POST /api/v1/auth/client/register
     * Register a new SAAS client
     */
    async register(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { company_name, email, password, plan } = request.body as {
                company_name: string;
                email: string;
                password: string;
                plan?: 'free' | 'business' | 'enterprise';
            };

            // Check for duplicate email
            const existingClient = await this.clientRepository.findByEmail(email);
            if (existingClient) {
                return reply.status(409).send({
                    error: 'Email already registered',
                });
            }

            // Hash password
            const passwordHash = await bcrypt.hash(password, 12);

            // Create client
            const client = await this.clientRepository.createClient({
                company_name,
                email,
                password_hash: passwordHash,
                plan: plan || 'free',
            });

            // Generate API key pair
            const keys = await this.apiKeyService.generateApiKeyPair(client.client_id);

            return reply.status(201).send({
                client_id: client.client_id,
                tenant_id: client.tenant_id,
                api_key: keys.primary_key,
                api_secret: keys.secondary_key,
                message: 'Registration successful. Store your API keys securely - they cannot be retrieved later.',
            });
        } catch (error: any) {
            request.log.error({ error }, 'Client registration error');
            return reply.status(500).send({
                error: 'Internal server error during registration',
            });
        }
    }

    // ─── API Key Management ───

    /**
     * POST /api/v1/auth/client/api-keys/rotate
     * Generate new secondary API key
     */
    async rotateApiKey(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { client_id } = request.body as { client_id: string };

            const result = await this.apiKeyService.rotateApiKey(client_id);

            return reply.send({
                secondary_key: result.secondary_key,
                message: 'New secondary key generated. Update your application and then promote it.',
            });
        } catch (error: any) {
            request.log.error({ error }, 'API key rotation error');
            return reply.status(400).send({
                error: error.message || 'Failed to rotate API key',
            });
        }
    }

    /**
     * POST /api/v1/auth/client/api-keys/promote
     * Promote secondary key to primary
     */
    async promoteApiKey(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { client_id } = request.body as { client_id: string };

            await this.apiKeyService.promoteSecondaryKey(client_id);

            return reply.send({
                message: 'Secondary key promoted to primary. Old primary key revoked.',
            });
        } catch (error: any) {
            request.log.error({ error }, 'API key promotion error');
            return reply.status(400).send({
                error: error.message || 'Failed to promote API key',
            });
        }
    }

    /**
     * POST /api/v1/auth/client/api-keys/revoke
     * Revoke specific API key
     */
    async revokeApiKey(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { client_id, key_type } = request.body as {
                client_id: string;
                key_type: 'primary' | 'secondary';
            };

            await this.apiKeyService.revokeApiKey(client_id, key_type);

            return reply.send({
                message: 'API key revoked successfully',
            });
        } catch (error: any) {
            request.log.error({ error }, 'API key revocation error');
            return reply.status(400).send({
                error: error.message || 'Failed to revoke API key',
            });
        }
    }

    // ─── IP Whitelist Management ───

    /**
     * GET /api/v1/auth/client/ip-whitelist
     * Get IP whitelist for client
     */
    async getIpWhitelist(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { client_id } = request.query as { client_id: string };

            const ips = await this.ipWhitelistService.getWhitelist(client_id);

            return reply.send({ ips });
        } catch (error: any) {
            request.log.error({ error }, 'Get IP whitelist error');
            return reply.status(400).send({
                error: error.message || 'Failed to get IP whitelist',
            });
        }
    }

    /**
     * POST /api/v1/auth/client/ip-whitelist
     * Add IP to whitelist
     */
    async addIpToWhitelist(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { client_id, ip } = request.body as { client_id: string; ip: string };

            await this.ipWhitelistService.addIp(client_id, ip);

            return reply.send({ message: 'IP added to whitelist' });
        } catch (error: any) {
            request.log.error({ error }, 'Add IP to whitelist error');
            return reply.status(400).send({
                error: error.message || 'Failed to add IP to whitelist',
            });
        }
    }

    /**
     * DELETE /api/v1/auth/client/ip-whitelist/:ip
     * Remove IP from whitelist
     */
    async removeIpFromWhitelist(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { client_id } = request.query as { client_id: string };
            const { ip } = request.params as { ip: string };

            await this.ipWhitelistService.removeIp(client_id, decodeURIComponent(ip));

            return reply.send({ message: 'IP removed from whitelist' });
        } catch (error: any) {
            request.log.error({ error }, 'Remove IP from whitelist error');
            return reply.status(400).send({
                error: error.message || 'Failed to remove IP from whitelist',
            });
        }
    }

    // ─── Origin Whitelist Management ───

    /**
     * GET /api/v1/auth/client/origin-whitelist
     * Get origin whitelist for client
     */
    async getOriginWhitelist(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { client_id } = request.query as { client_id: string };

            const client = await this.clientRepository.findById(client_id);
            if (!client) {
                return reply.status(404).send({ error: 'Client not found' });
            }

            return reply.send({ origins: client.origin_whitelist || [] });
        } catch (error: any) {
            request.log.error({ error }, 'Get origin whitelist error');
            return reply.status(400).send({
                error: error.message || 'Failed to get origin whitelist',
            });
        }
    }

    /**
     * POST /api/v1/auth/client/origin-whitelist
     * Add origin to whitelist
     */
    async addOriginToWhitelist(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { client_id, origin } = request.body as { client_id: string; origin: string };

            // Basic origin validation
            try {
                new URL(origin);
            } catch {
                return reply.status(400).send({ error: 'Invalid origin URL format' });
            }

            const client = await this.clientRepository.findById(client_id);
            if (!client) {
                return reply.status(404).send({ error: 'Client not found' });
            }

            if (client.origin_whitelist.includes(origin)) {
                return reply.status(409).send({ error: 'Origin already in whitelist' });
            }

            const updatedList = [...client.origin_whitelist, origin];
            await this.clientRepository.updateOriginWhitelist(client_id, updatedList);

            return reply.send({ message: 'Origin added to whitelist' });
        } catch (error: any) {
            request.log.error({ error }, 'Add origin to whitelist error');
            return reply.status(400).send({
                error: error.message || 'Failed to add origin to whitelist',
            });
        }
    }

    /**
     * DELETE /api/v1/auth/client/origin-whitelist/:origin
     * Remove origin from whitelist
     */
    async removeOriginFromWhitelist(request: FastifyRequest, reply: FastifyReply) {
        try {
            const { client_id } = request.query as { client_id: string };
            const { origin } = request.params as { origin: string };

            const decodedOrigin = decodeURIComponent(origin);

            const client = await this.clientRepository.findById(client_id);
            if (!client) {
                return reply.status(404).send({ error: 'Client not found' });
            }

            const updatedList = client.origin_whitelist.filter((o: string) => o !== decodedOrigin);
            if (updatedList.length === client.origin_whitelist.length) {
                return reply.status(404).send({ error: 'Origin not found in whitelist' });
            }

            await this.clientRepository.updateOriginWhitelist(client_id, updatedList);

            return reply.send({ message: 'Origin removed from whitelist' });
        } catch (error: any) {
            request.log.error({ error }, 'Remove origin from whitelist error');
            return reply.status(400).send({
                error: error.message || 'Failed to remove origin from whitelist',
            });
        }
    }
}
