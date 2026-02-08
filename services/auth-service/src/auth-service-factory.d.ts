/**
 * Auth Service Factory
 * Creates and wires all authentication services with proper dependencies
 */
import { JWTGenerator } from './tokens/jwt-generator';
import { JWTValidator } from './tokens/jwt-validator';
import { RefreshService } from './refresh/refresh-service';
import { RevocationService } from './revocation/revocation-service';
import { SessionService } from './sessions/session-service';
import { TOTPService } from './mfa/totp/totp-service';
import { BackupCodeService } from './mfa/backup-codes/backup-code-service';
import { TrustedDeviceService } from './mfa/trusted-devices/trusted-device-service';
import { MFAChallengeService } from './mfa/challenge/mfa-challenge-service';
export interface AuthServiceConfig {
    redis: {
        host: string;
        port: number;
        password?: string;
        db?: number;
    };
    mongodb: {
        url: string;
        database: string;
    };
    kafka: {
        brokers: string[];
        clientId: string;
    };
    jwt: {
        algorithm: 'RS256' | 'ES256';
        accessTokenExpiry: string;
        refreshTokenExpiry: string;
        issuer: string;
        privateKeyPath: string;
        publicKeyPath: string;
    };
    session: {
        ttl: number;
        maxSessionsPerUser: number;
        renewalCooldown: number;
        maxLifetime: number;
    };
    mfa: {
        totpIssuer: string;
        backupCodeCount: number;
        trustTokenExpiry: number;
        challengeTTL: number;
        maxAttempts: number;
    };
}
export declare class AuthServiceFactory {
    private redis;
    private mongodb;
    private kafkaProducer;
    private config;
    private jwtGenerator?;
    private jwtValidator?;
    private refreshService?;
    private revocationService?;
    private sessionService?;
    private totpService?;
    private backupCodeService?;
    private trustedDeviceService?;
    private mfaChallengeService?;
    constructor(config: AuthServiceConfig);
    initialize(): Promise<void>;
    getJWTGenerator(): JWTGenerator;
    getJWTValidator(): JWTValidator;
    getRefreshService(): RefreshService;
    getRevocationService(): RevocationService;
    getSessionService(): SessionService;
    getTOTPService(): TOTPService;
    getBackupCodeService(): BackupCodeService;
    getTrustedDeviceService(): TrustedDeviceService;
    getMFAChallengeService(): MFAChallengeService;
    shutdown(): Promise<void>;
}
