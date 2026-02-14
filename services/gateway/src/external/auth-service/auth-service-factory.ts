/**
 * Auth Service Factory
 * Creates and wires all authentication services with proper dependencies
 */

import Redis from 'ioredis';
import { MongoClient, Db } from 'mongodb';
import { Kafka, Producer } from 'kafkajs';

// Token services
import { JWTGenerator } from './tokens/jwt-generator';
import { JWTValidator } from './tokens/jwt-validator';
import { KeyProvider } from './tokens/key-provider';
import { JWTConfig, defaultJWTConfig } from './tokens/jwt-config';
import { RevocationChecker } from './tokens/revocation-checker';

// Refresh services
import { RefreshService } from './refresh/refresh-service';
import { RefreshTokenStore } from './refresh/refresh-token-store';
import { FamilyTracker } from './refresh/family-tracker';
import { ReuseDetector } from './refresh/reuse-detection';
import { createDefaultRotationPolicy } from './refresh/rotation-policy';

// Revocation services
import { RevocationService } from './revocation/revocation-service';
import { RevocationStore } from './revocation/revocation-store';
import { RevocationEventPublisher } from './revocation/revocation-events';

// Session services
import { SessionService } from './sessions/session-service';
import { SessionStore } from './sessions/session-store';
import { SessionValidator } from './sessions/session-validator';
import { SessionRenewal } from './sessions/session-renewal';
import { SessionTermination } from './sessions/session-termination';
import { SessionCleanup } from './sessions/session-cleanup';
import { DeviceFingerprint } from './sessions/device-fingerprint';

// Session security
import { SessionBinding } from './sessions/security/session-binding';
import { ConcurrentSessionHandler } from './sessions/security/concurrent-handler';
import { AnomalyDetector } from './sessions/security/anomaly-detector';
import { SessionHijackDetector } from './sessions/security/session-hijack-detector';
import { ConcurrentSessionPolicy, SessionLimitAction } from './sessions/security/types';

// MFA services
import { TOTPService, defaultTOTPConfig } from './mfa/totp/totp-service';
import { BackupCodeService } from './mfa/backup-codes/backup-code-service';
import { TrustedDeviceService } from './mfa/trusted-devices/trusted-device-service';
import { MFAChallengeService } from './mfa/challenge/mfa-challenge-service';
import { ChallengeStorage } from './mfa/challenge/challenge-storage';
import { MethodVerifier } from './mfa/challenge/method-verifier';
import { BackupCodeGenerator } from './mfa/backup-codes/code-generator';
import { createBackupCodeStorage } from './mfa/backup-codes/code-storage';
import { createTrustStorage } from './mfa/trusted-devices/trust-storage';

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

export class AuthServiceFactory {
  private redis: Redis;
  private mongodb: Db;
  private kafkaProducer: Producer;
  private kafka: Kafka;
  private config: AuthServiceConfig;

  // Service instances
  private jwtGenerator?: JWTGenerator;
  private jwtValidator?: JWTValidator;
  private refreshService?: RefreshService;
  private revocationService?: RevocationService;
  private sessionService?: SessionService;
  private totpService?: TOTPService;
  private backupCodeService?: BackupCodeService;
  private trustedDeviceService?: TrustedDeviceService;
  private mfaChallengeService?: MFAChallengeService;

  constructor(config: AuthServiceConfig) {
    this.config = config;

    // Initialize Redis
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db || 0,
      retryStrategy: (times: number) => Math.min(times * 50, 2000),
    });

    // MongoDB will be initialized async
    this.mongodb = {} as Db;

    // Kafka will be initialized async
    this.kafkaProducer = {} as Producer;
    this.kafka = {} as Kafka;
  }

  async initialize(): Promise<void> {
    console.log('Initializing Auth Service Factory...');
    // Initialize MongoDB
    console.log('Connecting to MongoDB...');
    const mongoClient = new MongoClient(this.config.mongodb.url);
    await mongoClient.connect();
    this.mongodb = mongoClient.db(this.config.mongodb.database);
    console.log('MongoDB connected.');

    // Initialize Kafka
    console.log('Connecting to Kafka...');
    this.kafka = new Kafka({
      clientId: this.config.kafka.clientId,
      brokers: this.config.kafka.brokers,
      retry: {
        initialRetryTime: 300,
        retries: 5
      }
    });
    this.kafkaProducer = this.kafka.producer();
    await this.kafkaProducer.connect();
    console.log('Kafka connected.');

    console.log('Auth Service Factory initialized successfully');
  }

  // JWT Services
  getJWTGenerator(): JWTGenerator {
    if (!this.jwtGenerator) {
      // Extract directory from path or use default
      const keysDir = this.config.jwt.privateKeyPath
        ? this.config.jwt.privateKeyPath.substring(0, this.config.jwt.privateKeyPath.lastIndexOf('/'))
        : '/app/keys';

      const keyProvider = new KeyProvider({
        keysDirectory: keysDir,
        platformKeyId: 'platform-key-1',
        enableTenantKeys: false
      });

      // Construct JWTConfig object
      const jwtConfig: JWTConfig = {
        ...defaultJWTConfig,
        algorithm: this.config.jwt.algorithm,
        accessTokenExpiry: parseInt(this.config.jwt.accessTokenExpiry) || defaultJWTConfig.accessTokenExpiry,
        refreshTokenExpiry: parseInt(this.config.jwt.refreshTokenExpiry) || defaultJWTConfig.refreshTokenExpiry,
        issuer: this.config.jwt.issuer,
      };

      this.jwtGenerator = new JWTGenerator(keyProvider, jwtConfig);
    }
    return this.jwtGenerator;
  }

  getJWTValidator(): JWTValidator {
    if (!this.jwtValidator) {
      // Extract directory from path or use default
      const keysDir = this.config.jwt.privateKeyPath
        ? this.config.jwt.privateKeyPath.substring(0, this.config.jwt.privateKeyPath.lastIndexOf('/'))
        : '/app/keys';

      const keyProvider = new KeyProvider({
        keysDirectory: keysDir,
        platformKeyId: 'platform-key-1',
        enableTenantKeys: false
      });

      // Construct JWTConfig object
      const jwtConfig: JWTConfig = {
        ...defaultJWTConfig,
        algorithm: this.config.jwt.algorithm,
        accessTokenExpiry: parseInt(this.config.jwt.accessTokenExpiry) || defaultJWTConfig.accessTokenExpiry,
        refreshTokenExpiry: parseInt(this.config.jwt.refreshTokenExpiry) || defaultJWTConfig.refreshTokenExpiry,
        issuer: this.config.jwt.issuer,
      };

      const revocationChecker = new RevocationChecker({
        redis: this.redis,
        keyPrefix: 'revoked:'
      });

      this.jwtValidator = new JWTValidator(keyProvider, jwtConfig, revocationChecker);
    }
    return this.jwtValidator;
  }

  // Refresh Services
  getRefreshService(): RefreshService {
    if (!this.refreshService) {
      const refreshTokenStore = new RefreshTokenStore(this.redis);
      const familyTracker = new FamilyTracker(this.redis);
      const reuseDetection = new ReuseDetector(refreshTokenStore, familyTracker);
      const rotationPolicy = createDefaultRotationPolicy();

      this.refreshService = new RefreshService(
        this.getJWTGenerator(),
        this.getJWTValidator(),
        refreshTokenStore,
        familyTracker,
        reuseDetection,
        rotationPolicy
      );
    }
    return this.refreshService;
  }

  // Revocation Services
  getRevocationService(): RevocationService {
    if (!this.revocationService) {
      const revocationStore = new RevocationStore(this.redis);
      // RevocationEventPublisher expects the Kafka client, not just the producer
      const revocationEvents = new RevocationEventPublisher(this.kafka);

      this.revocationService = new RevocationService(
        revocationStore,
        revocationEvents
      );
    }
    return this.revocationService;
  }

  // Session Services
  getSessionService(): SessionService {
    if (!this.sessionService) {
      const sessionStore = new SessionStore(this.redis);

      // Create renewal policy
      const renewalPolicy = {
        enabled: true,
        cooldownMs: this.config.session.renewalCooldown || 60000,
        maxLifetimeMs: this.config.session.maxLifetime || 7 * 24 * 60 * 60 * 1000,
        renewalThresholdMs: 3600000, // 1 hour
      };

      const sessionTermination = new SessionTermination(
        sessionStore,
        this.getRevocationService()
      );

      // Session config matching SessionConfig interface
      const sessionConfig = {
        ttl_seconds: this.config.session.ttl || 86400,
        max_sessions_per_user: this.config.session.maxSessionsPerUser || 5,
        renewal_cooldown_ms: this.config.session.renewalCooldown || 60000,
        max_lifetime_seconds: this.config.session.maxLifetime || 604800,
        cleanup_interval_ms: 300000, // 5 minutes
      };

      this.sessionService = new SessionService(
        sessionStore,
        sessionConfig,
        renewalPolicy,
        sessionTermination
      );

      // TODO: Start cleanup job when SessionMetricsCollector is available
      // The SessionCleanup requires a metricsCollector which needs to be initialized
    }
    return this.sessionService;
  }

  // MFA Services
  getTOTPService(): TOTPService {
    if (!this.totpService) {
      const totpConfig = {
        ...defaultTOTPConfig,
        issuer: this.config.mfa.totpIssuer
      };
      // TOTPService constructor takes config
      this.totpService = new TOTPService(totpConfig);
    }
    return this.totpService;
  }

  getBackupCodeService(): BackupCodeService {
    if (!this.backupCodeService) {
      // BackupCodeService(generator, storage)
      const generator = new BackupCodeGenerator();
      const storage = createBackupCodeStorage(); // Currently in-memory

      this.backupCodeService = new BackupCodeService(
        generator,
        storage
      );
    }
    return this.backupCodeService;
  }

  getTrustedDeviceService(): TrustedDeviceService {
    if (!this.trustedDeviceService) {
      // TrustedDeviceService(storage, trustExpiryDays, maxTrustedDevices)
      const storage = createTrustStorage(); // Currently in-memory

      this.trustedDeviceService = new TrustedDeviceService(
        storage,
        this.config.mfa.trustTokenExpiry || 30,
        10 // default max trusted devices
      );
    }
    return this.trustedDeviceService;
  }

  getMFAChallengeService(): MFAChallengeService {
    if (!this.mfaChallengeService) {
      const challengeStorage = new ChallengeStorage(this.redis);
      const methodVerifier = new MethodVerifier(
        this.getTOTPService(),
        this.getBackupCodeService()
      );

      this.mfaChallengeService = new MFAChallengeService(
        challengeStorage,
        methodVerifier,
        this.config.mfa.challengeTTL,
        this.config.mfa.maxAttempts
      );
    }
    return this.mfaChallengeService;
  }

  async shutdown(): Promise<void> {
    await this.redis.quit();
    await this.kafkaProducer.disconnect();
    console.log('Auth Service Factory shut down successfully');
  }
}
