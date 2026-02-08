/**
 * JWT Token Generator
 * Phase 2 - Authentication - Task AUTH-001
 *
 * Generates JWT tokens with RS256/ES256 algorithms
 * Supports access tokens, refresh tokens, and service tokens
 */
import { KeyProvider } from './key-provider';
import { JWTConfig } from './jwt-config';
import { TokenPair, GenerateAccessTokenParams } from './types';
export declare class JWTGenerator {
    private keyProvider;
    private config;
    constructor(keyProvider: KeyProvider, config: JWTConfig);
    /**
     * Generate access and refresh token pair
     */
    generateAccessToken(params: GenerateAccessTokenParams): Promise<TokenPair>;
    /**
     * Generate refresh token only
     */
    generateRefreshToken(userId: string, tokenId: string): Promise<string>;
    /**
     * Generate service-to-service token
     */
    generateServiceToken(service: string): Promise<string>;
    /**
     * Generate short-lived token for specific purpose
     */
    generateShortLivedToken(userId: string, purpose: string, expirySeconds?: number): Promise<string>;
    /**
     * Get token expiry time from payload
     */
    getTokenExpiry(token: string): number | null;
    /**
     * Get token ID from payload
     */
    getTokenId(token: string): string | null;
    /**
     * Check if token is expired (without verification)
     */
    isTokenExpired(token: string): boolean;
}
