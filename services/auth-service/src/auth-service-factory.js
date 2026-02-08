"use strict";
/**
 * Auth Service Factory
 * Creates and wires all authentication services with proper dependencies
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthServiceFactory = void 0;
const ioredis_1 = require("ioredis");
const mongodb_1 = require("mongodb");
const kafkajs_1 = require("kafkajs");
// Token services
const jwt_generator_1 = require("./tokens/jwt-generator");
const jwt_validator_1 = require("./tokens/jwt-validator");
const key_provider_1 = require("./tokens/key-provider");
const revocation_checker_1 = require("./tokens/revocation-checker");
// Refresh services
const refresh_service_1 = require("./refresh/refresh-service");
const refresh_token_store_1 = require("./refresh/refresh-token-store");
const family_tracker_1 = require("./refresh/family-tracker");
const reuse_detection_1 = require("./refresh/reuse-detection");
const rotation_policy_1 = require("./refresh/rotation-policy");
// Revocation services
const revocation_service_1 = require("./revocation/revocation-service");
const revocation_store_1 = require("./revocation/revocation-store");
const revocation_events_1 = require("./revocation/revocation-events");
// Session services
const session_service_1 = require("./sessions/session-service");
const session_store_1 = require("./sessions/session-store");
const session_validator_1 = require("./sessions/session-validator");
const session_renewal_1 = require("./sessions/session-renewal");
const session_termination_1 = require("./sessions/session-termination");
const session_cleanup_1 = require("./sessions/session-cleanup");
const device_fingerprint_1 = require("./sessions/device-fingerprint");
// Session security
const session_binding_1 = require("./sessions/security/session-binding");
const concurrent_handler_1 = require("./sessions/security/concurrent-handler");
const anomaly_detector_1 = require("./sessions/security/anomaly-detector");
const session_hijack_detector_1 = require("./sessions/security/session-hijack-detector");
// MFA services
const totp_service_1 = require("./mfa/totp/totp-service");
const backup_code_service_1 = require("./mfa/backup-codes/backup-code-service");
const trusted_device_service_1 = require("./mfa/trusted-devices/trusted-device-service");
const mfa_challenge_service_1 = require("./mfa/challenge/mfa-challenge-service");
const challenge_storage_1 = require("./mfa/challenge/challenge-storage");
const method_verifier_1 = require("./mfa/challenge/method-verifier");
class AuthServiceFactory {
    redis;
    mongodb;
    kafkaProducer;
    config;
    // Service instances
    jwtGenerator;
    jwtValidator;
    refreshService;
    revocationService;
    sessionService;
    totpService;
    backupCodeService;
    trustedDeviceService;
    mfaChallengeService;
    constructor(config) {
        this.config = config;
        // Initialize Redis
        this.redis = new ioredis_1.Redis({
            host: config.redis.host,
            port: config.redis.port,
            password: config.redis.password,
            db: config.redis.db || 0,
            retryStrategy: (times) => Math.min(times * 50, 2000),
        });
        // MongoDB will be initialized async
        this.mongodb = {};
        // Kafka will be initialized async
        this.kafkaProducer = {};
    }
    async initialize() {
        // Initialize MongoDB
        const mongoClient = new mongodb_1.MongoClient(this.config.mongodb.url);
        await mongoClient.connect();
        this.mongodb = mongoClient.db(this.config.mongodb.database);
        // Initialize Kafka
        const kafka = new kafkajs_1.Kafka({
            clientId: this.config.kafka.clientId,
            brokers: this.config.kafka.brokers,
        });
        this.kafkaProducer = kafka.producer();
        await this.kafkaProducer.connect();
        console.log('Auth Service Factory initialized successfully');
    }
    // JWT Services
    getJWTGenerator() {
        if (!this.jwtGenerator) {
            const keyProvider = new key_provider_1.KeyProvider({
                privateKeyPath: this.config.jwt.privateKeyPath,
                publicKeyPath: this.config.jwt.publicKeyPath,
                algorithm: this.config.jwt.algorithm,
            });
            const jwtConfig = new jwt_config_1.JWTConfig({
                algorithm: this.config.jwt.algorithm,
                accessTokenExpiry: this.config.jwt.accessTokenExpiry,
                refreshTokenExpiry: this.config.jwt.refreshTokenExpiry,
                issuer: this.config.jwt.issuer,
            });
            this.jwtGenerator = new jwt_generator_1.JWTGenerator(keyProvider, jwtConfig);
        }
        return this.jwtGenerator;
    }
    getJWTValidator() {
        if (!this.jwtValidator) {
            const keyProvider = new key_provider_1.KeyProvider({
                privateKeyPath: this.config.jwt.privateKeyPath,
                publicKeyPath: this.config.jwt.publicKeyPath,
                algorithm: this.config.jwt.algorithm,
            });
            const jwtConfig = new jwt_config_1.JWTConfig({
                algorithm: this.config.jwt.algorithm,
                accessTokenExpiry: this.config.jwt.accessTokenExpiry,
                refreshTokenExpiry: this.config.jwt.refreshTokenExpiry,
                issuer: this.config.jwt.issuer,
            });
            const revocationChecker = new revocation_checker_1.RevocationChecker(this.redis);
            this.jwtValidator = new jwt_validator_1.JWTValidator(keyProvider, jwtConfig, revocationChecker);
        }
        return this.jwtValidator;
    }
    // Refresh Services
    getRefreshService() {
        if (!this.refreshService) {
            const refreshTokenStore = new refresh_token_store_1.RefreshTokenStore(this.redis);
            const familyTracker = new family_tracker_1.FamilyTracker(this.redis);
            const reuseDetection = new reuse_detection_1.ReuseDetection(familyTracker);
            const rotationPolicy = new rotation_policy_1.RotationPolicy();
            this.refreshService = new refresh_service_1.RefreshService(refreshTokenStore, this.getJWTGenerator(), familyTracker, reuseDetection, rotationPolicy);
        }
        return this.refreshService;
    }
    // Revocation Services
    getRevocationService() {
        if (!this.revocationService) {
            const revocationStore = new revocation_store_1.RevocationStore(this.redis);
            const revocationEvents = new revocation_events_1.RevocationEvents(this.kafkaProducer);
            this.revocationService = new revocation_service_1.RevocationService(revocationStore, revocationEvents);
        }
        return this.revocationService;
    }
    // Session Services
    getSessionService() {
        if (!this.sessionService) {
            const sessionStore = new session_store_1.SessionStore(this.redis);
            const sessionValidator = new session_validator_1.SessionValidator(sessionStore);
            const sessionRenewal = new session_renewal_1.SessionRenewal(sessionStore, this.config.session.renewalCooldown, this.config.session.maxLifetime);
            const sessionTermination = new session_termination_1.SessionTermination(sessionStore, this.getRevocationService());
            const deviceFingerprint = new device_fingerprint_1.DeviceFingerprint();
            // Session security features
            const sessionBinding = new session_binding_1.SessionBinding();
            const concurrentHandler = new concurrent_handler_1.ConcurrentHandler(sessionStore, this.config.session.maxSessionsPerUser);
            const anomalyDetector = new anomaly_detector_1.AnomalyDetector();
            const hijackDetector = new session_hijack_detector_1.SessionHijackDetector();
            this.sessionService = new session_service_1.SessionService(sessionStore, sessionValidator, sessionRenewal, sessionTermination, deviceFingerprint, sessionBinding, concurrentHandler, anomalyDetector, hijackDetector);
            // Start cleanup job
            const sessionCleanup = new session_cleanup_1.SessionCleanup(sessionStore);
            sessionCleanup.start();
        }
        return this.sessionService;
    }
    // MFA Services
    getTOTPService() {
        if (!this.totpService) {
            this.totpService = new totp_service_1.TOTPService(this.mongodb, this.config.mfa.totpIssuer);
        }
        return this.totpService;
    }
    getBackupCodeService() {
        if (!this.backupCodeService) {
            this.backupCodeService = new backup_code_service_1.BackupCodeService(this.mongodb, this.config.mfa.backupCodeCount);
        }
        return this.backupCodeService;
    }
    getTrustedDeviceService() {
        if (!this.trustedDeviceService) {
            this.trustedDeviceService = new trusted_device_service_1.TrustedDeviceService(this.mongodb, this.config.mfa.trustTokenExpiry);
        }
        return this.trustedDeviceService;
    }
    getMFAChallengeService() {
        if (!this.mfaChallengeService) {
            const challengeStorage = new challenge_storage_1.ChallengeStorage(this.redis);
            const methodVerifier = new method_verifier_1.MethodVerifier(this.getTOTPService(), this.getBackupCodeService());
            this.mfaChallengeService = new mfa_challenge_service_1.MFAChallengeService(challengeStorage, methodVerifier, this.config.mfa.challengeTTL, this.config.mfa.maxAttempts);
        }
        return this.mfaChallengeService;
    }
    async shutdown() {
        await this.redis.quit();
        await this.kafkaProducer.disconnect();
        console.log('Auth Service Factory shut down successfully');
    }
}
exports.AuthServiceFactory = AuthServiceFactory;
//# sourceMappingURL=auth-service-factory.js.map