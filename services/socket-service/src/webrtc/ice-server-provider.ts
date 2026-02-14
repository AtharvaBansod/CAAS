import { TurnCredentialsGenerator } from './turn-credentials-generator';
import { TurnServerProvider } from './turn-server-provider';
import { getLogger } from '../utils/logger';

const logger = getLogger('IceServerProvider');

export interface RTCIceServer {
    urls: string | string[];
    username?: string;
    credential?: string;
    credentialType?: 'password' | 'oauth';
}

export class IceServerProvider {
    private turnCredentialsGenerator: TurnCredentialsGenerator;
    private turnServerProvider?: TurnServerProvider;
    private stunServers: string[];
    private turnServers: string[];

    constructor(turnServerProvider?: TurnServerProvider) {
        // TURN secret from environment or default
        const turnSecret = process.env.TURN_SECRET || 'default-turn-secret-change-in-production';
        const turnTtl = parseInt(process.env.TURN_CREDENTIAL_TTL || '86400', 10);

        this.turnCredentialsGenerator = new TurnCredentialsGenerator(turnSecret, turnTtl);
        this.turnServerProvider = turnServerProvider;

        // STUN servers (public Google STUN servers as fallback)
        this.stunServers = process.env.STUN_SERVERS
            ? process.env.STUN_SERVERS.split(',')
            : [
                'stun:stun.l.google.com:19302',
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302',
            ];

        // TURN servers from environment (legacy support)
        this.turnServers = process.env.TURN_SERVERS
            ? process.env.TURN_SERVERS.split(',')
            : [];
    }

    /**
     * Get ICE servers with credentials for a user
     */
    async getIceServers(userId: string, tenantId: string): Promise<RTCIceServer[]> {
        const iceServers: RTCIceServer[] = [];

        // Add STUN servers (no authentication needed)
        iceServers.push({
            urls: this.stunServers,
        });

        // Use TurnServerProvider if available (preferred)
        if (this.turnServerProvider) {
            try {
                const turnCredentials = this.turnServerProvider.generateMultiServerCredentials(userId, tenantId);
                
                for (const cred of turnCredentials) {
                    iceServers.push({
                        urls: cred.urls,
                        username: cred.username,
                        credential: cred.credential,
                        credentialType: 'password',
                    });
                }

                logger.debug(`Provided ${iceServers.length} ICE servers (with TURN) to user ${userId}`);
            } catch (error) {
                logger.error({ err: error }, 'Failed to get TURN credentials from TurnServerProvider');
                // Fall back to legacy method
                this.addLegacyTurnServers(iceServers, userId);
            }
        } else {
            // Legacy TURN server support
            this.addLegacyTurnServers(iceServers, userId);
        }

        return iceServers;
    }

    /**
     * Add legacy TURN servers (backward compatibility)
     */
    private addLegacyTurnServers(iceServers: RTCIceServer[], userId: string): void {
        if (this.turnServers.length > 0) {
            const turnCredentials = this.turnCredentialsGenerator.generateCredentials(userId);

            for (const turnServer of this.turnServers) {
                iceServers.push({
                    urls: turnServer,
                    username: turnCredentials.username,
                    credential: turnCredentials.credential,
                    credentialType: 'password',
                });
            }

            logger.debug(`Provided ${iceServers.length} ICE servers (legacy TURN) to user ${userId}`);
        }
    }

    /**
     * Get TURN credentials for a user
     */
    async getTurnCredentials(userId: string, tenantId?: string): Promise<{ username: string; credential: string; ttl: number }> {
        if (this.turnServerProvider && tenantId) {
            try {
                const creds = this.turnServerProvider.generateCredentials(userId, tenantId);
                return {
                    username: creds.username,
                    credential: creds.credential,
                    ttl: parseInt(process.env.TURN_CREDENTIAL_TTL || '86400', 10),
                };
            } catch (error) {
                logger.error({ err: error }, 'Failed to get TURN credentials from TurnServerProvider');
            }
        }
        
        // Fall back to legacy method
        return this.turnCredentialsGenerator.generateCredentials(userId);
    }

    /**
     * Get TURN server status
     */
    getTurnServerStatus(): any {
        if (this.turnServerProvider) {
            return this.turnServerProvider.getServerStatus();
        }
        return { legacy: true, servers: this.turnServers };
    }
}
