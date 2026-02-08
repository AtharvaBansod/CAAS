/**
 * Auth Service Factory
 * Creates and wires all authentication services with proper dependencies
 */

import { Redis } from 'ioredis';
import { MongoClient, Db } from 'mongodb';
import { Kafka, Producer } from 'kafkajs';

// Token services
import { JWTGenerator } from './tokens/jwt-generator';
import { JWTValidator } from './tokens/jwt-validator';
import { KeyProvider } from './tokens/key-provider';
import { JWTConfig } from './tokens/jwt-config';
import { RevocationChecker } from './tokens/revocation-checker';

// Refresh services
import { RefreshService } from './refresh/refresh-service';
import { RefreshTokenStore } from './refresh/refresh-token-store';
import { FamilyTracker } from './refresh/family-tracker';
import { ReuseDetection } from './refresh/reuse-detection';
import { RotationPolicy } from './refresh/rotation-policy';

// Revocation services
import { RevocationService } from './revocation/revocation-service';
import { RevocationStore } from './revocation/revocation-store';
import { RevocationEvents } from './revocation/revocation-events';

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
import { ConcurrentHandler } from './sessions/security/concurrent-handler';
import { AnomalyDetector } from './sessions/security/anomaly-detector';
import { SessionHijackDetector } from './sessions/security/session-hijack-detector';

// MFA services
import { TOTPService } from './mfa/totp/totp-service';
import { BackupCodeService } from './mfa/backup-codes/backup-code-service';
import { TrustedDeviceService } from './mfa/trusted-devices/trusted-device-service';
import { MFAChallengeService } from './mfa/challenge/mfa-challenge-service';
import { ChallengeStorage } from './mfa/challenge/challenge-storage';
import { MethodVerifier } from './mfa/challenge/method-verifier';

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
      retryStrategy: (times) => Math.min(times * 50, 2000),
    });

    // MongoDB will be initialized async
    this.mongodb = {} as Db;
    
    // Kafka will be initialized async
    this.kafkaProducer = {} as Producer;
  }

  async initialize(): Promise<void> {
    // Initialize MongoDB
    const mongoClient = new MongoClient(this.config.mongodb.url);
    await mongoClient.connect();
    this.mongodb = mongoClient.db(this.config.mongodb.database);

    // Initialize Kafka
    const kafka = new Kafka({
      clientId: this.config.kafka.clientId,
      brokers: this.config.kafka.brokers,
    });
    this.kafkaProducer = kafka.producer();
    await this.kafkaProducer.connect();

    console.log('Auth Service Factory initialized successfully');
  }

  // JWT Services
  getJWTGenerator(): JWTGenerator {
    if (!this.jwtGenerator) {
      const keyProvider = new KeyProvider({
        privateKeyPath: this.config.jwt.privateKeyPath,
        publicKeyPath: this.config.jwt.publicKeyPath,
        algorithm: this.config.jwt.algorithm,
      });

      const jwtConfig = new JWTConfig({
        algorithm: this.config.jwt.algorithm,
        accessTokenExpiry: this.config.jwt.accessTokenExpiry,
        refreshTokenExpiry: this.config.jwt.refreshTokenExpiry,
        issuer: this.config.jwt.issuer,
      });

      this.jwtGenerator = new JWTGenerator(keyProvider, jwtConfig);
    }
    return this.jwtGenerator;
  }

  getJWTValidator(): JWTValidator {
    if (!this.jwtValidator) {
      const keyProvider = new KeyProvider({
        privateKeyPath: this.config.jwt.privateKeyPath,
        publicKeyPath: this.config.jwt.publicKeyPath,
        algorithm: this.config.jwt.algorithm,
      });

      const jwtConfig = new JWTConfig({
        algorithm: this.config.jwt.algorithm,
        accessTokenExpiry: this.config.jwt.accessTokenExpiry,
        refreshTokenExpiry: this.config.jwt.refreshTokenExpiry,
        issuer: this.config.jwt.issuer,
      });

      const revocationChecker = new RevocationChecker(this.redis);

      this.jwtValidator = new JWTValidator(keyProvider, jwtConfig, revocationChecker);
    }
    return this.jwtValidator;
  }

  // Refresh Services
  getRefreshService(): RefreshService {
    if (!this.refreshService) {
      const refreshTokenStore = new RefreshTokenStore(this.redis);
      const familyTracker = new FamilyTracker(this.redis);
      const reuseDetection = new ReuseDetection(familyTracker);
      const rotationPolicy = new RotationPolicy();

      this.refreshService = new RefreshService(
        refreshTokenStore,
        this.getJWTGenerator(),
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
      const revocationEvents = new RevocationEvents(this.kafkaProducer);

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
      const sessionValidator = new SessionValidator(sessionStore);
      const sessionRenewal = new SessionRenewal(
        sessionStore,
        this.config.session.renewalCooldown,
        this.config.session.maxLifetime
      );
      const sessionTermination = new SessionTermination(
        sessionStore,
        this.getRevocationService()
      );
      const deviceFingerprint = new DeviceFingerprint();

      // Session security features
      const sessionBinding = new SessionBinding();
      const concurrentHandler = new ConcurrentHandler(
        sessionStore,
        this.config.session.maxSessionsPerUser
      );
      const anomalyDetector = new AnomalyDetector();
      const hijackDetector = new SessionHijackDetector();

      this.sessionService = new SessionService(
        sessionStore,
        sessionValidator,
        sessionRenewal,
        sessionTermination,
        deviceFingerprint,
        sessionBinding,
        concurrentHandler,
        anomalyDetector,
        hijackDetector
      );

      // Start cleanup job
      const sessionCleanup = new SessionCleanup(sessionStore);
      sessionCleanup.start();
    }
    return this.sessionService;
  }

  // MFA Services
  getTOTPService(): TOTPService {
    if (!this.totpService) {
      this.totpService = new TOTPService(
        this.mongodb,
        this.config.mfa.totpIssuer
      );
    }
    return this.totpService;
  }

  getBackupCodeService(): BackupCodeService {
    if (!this.backupCodeService) {
      this.backupCodeService = new BackupCodeService(
        this.mongodb,
        this.config.mfa.backupCodeCount
      );
    }
    return this.backupCodeService;
  }

  getTrustedDeviceService(): TrustedDeviceService {
    if (!this.trustedDeviceService) {
      this.trustedDeviceService = new TrustedDeviceService(
        this.mongodb,
        this.config.mfa.trustTokenExpiry
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
