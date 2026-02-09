import crypto from 'crypto';
import { getLogger } from '../utils/logger';

const logger = getLogger('TurnCredentialsGenerator');

export interface TurnCredentials {
    username: string;
    credential: string;
    ttl: number;
}

export class TurnCredentialsGenerator {
    private secret: string;
    private ttl: number; // Time-to-live in seconds

    constructor(secret: string, ttl: number = 86400) {
        this.secret = secret;
        this.ttl = ttl;
    }

    /**
     * Generate time-limited TURN credentials using HMAC-based authentication (RFC 5766)
     */
    generateCredentials(username: string): TurnCredentials {
        // Create expiration timestamp
        const expirationTime = Math.floor(Date.now() / 1000) + this.ttl;

        // Username format: timestamp:username
        const turnUsername = `${expirationTime}:${username}`;

        // Generate HMAC-SHA1 credential
        const hmac = crypto.createHmac('sha1', this.secret);
        hmac.update(turnUsername);
        const credential = hmac.digest('base64');

        logger.debug(`Generated TURN credentials for ${username}, expires in ${this.ttl}s`);

        return {
            username: turnUsername,
            credential,
            ttl: this.ttl,
        };
    }

    /**
     * Verify if credentials are still valid
     */
    isValid(turnUsername: string): boolean {
        const parts = turnUsername.split(':');
        if (parts.length < 2) {
            return false;
        }

        const expirationTime = parseInt(parts[0], 10);
        const currentTime = Math.floor(Date.now() / 1000);

        return currentTime < expirationTime;
    }
}
