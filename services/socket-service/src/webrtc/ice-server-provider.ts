import { TurnCredentialsGenerator } from './turn-credentials-generator';
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
    private stunServers: string[];
    private turnServers: string[];

    constructor() {
        // TURN secret from environment or default
        const turnSecret = process.env.TURN_SECRET || 'default-turn-secret-change-in-production';
        const turnTtl = parseInt(process.env.TURN_CREDENTIAL_TTL || '86400', 10);

        this.turnCredentialsGenerator = new TurnCredentialsGenerator(turnSecret, turnTtl);

        // STUN servers (public Google STUN servers as fallback)
        this.stunServers = process.env.STUN_SERVERS
            ? process.env.STUN_SERVERS.split(',')
            : [
                'stun:stun.l.google.com:19302',
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302',
            ];

        // TURN servers from environment
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

        // Add TURN servers with credentials
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
        }

        logger.debug(`Provided ${iceServers.length} ICE servers to user ${userId}`);

        return iceServers;
    }

    /**
     * Get TURN credentials for a user
     */
    async getTurnCredentials(userId: string): Promise<{ username: string; credential: string; ttl: number }> {
        return this.turnCredentialsGenerator.generateCredentials(userId);
    }
}
