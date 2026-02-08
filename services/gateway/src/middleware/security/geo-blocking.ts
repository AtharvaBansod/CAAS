/**
 * Geo-Blocking
 * 
 * Geographic IP blocking with GeoIP lookup
 */

import * as fs from 'fs';
import * as path from 'path';

export interface GeoBlockingRule {
  _id?: string;
  tenant_id: string;
  rule_type: 'allow' | 'deny';
  countries: string[]; // ISO 3166-1 alpha-2 country codes
  description?: string;
  is_active: boolean;
}

export interface GeoIPResult {
  country_code: string;
  country_name: string;
  continent_code: string;
  is_vpn?: boolean;
  is_tor?: boolean;
  is_proxy?: boolean;
}

/**
 * Stub GeoIP service (replace with MaxMind GeoIP2 in production)
 */
export class GeoIPService {
  private database: any;
  private databasePath: string;

  constructor(databasePath?: string) {
    this.databasePath = databasePath || process.env.GEOIP_DATABASE_PATH || '/app/geoip/GeoLite2-Country.mmdb';
  }

  /**
   * Initialize GeoIP database
   */
  async initialize(): Promise<void> {
    // In production: use maxmind library
    // const maxmind = require('maxmind');
    // this.database = await maxmind.open(this.databasePath);
    
    console.log('GeoIP service initialized (stub mode)');
  }

  /**
   * Lookup IP address
   */
  async lookup(ipAddress: string): Promise<GeoIPResult | null> {
    // Stub implementation - return mock data
    // In production: use actual GeoIP database
    
    // Mock data for testing
    if (ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.') || ipAddress === '127.0.0.1') {
      return {
        country_code: 'US',
        country_name: 'United States',
        continent_code: 'NA',
      };
    }

    // In production:
    // const result = this.database.get(ipAddress);
    // return result ? {
    //   country_code: result.country.iso_code,
    //   country_name: result.country.names.en,
    //   continent_code: result.continent.code,
    // } : null;

    return null;
  }

  /**
   * Check if IP is VPN/Tor/Proxy
   */
  async checkAnonymizer(ipAddress: string): Promise<{
    is_vpn: boolean;
    is_tor: boolean;
    is_proxy: boolean;
  }> {
    // Stub implementation
    // In production: integrate with threat intelligence service
    return {
      is_vpn: false,
      is_tor: false,
      is_proxy: false,
    };
  }
}

/**
 * Geo-blocking manager
 */
export class GeoBlockingManager {
  private rules: Map<string, GeoBlockingRule[]>; // tenant_id -> rules
  private geoipService: GeoIPService;

  constructor(geoipService: GeoIPService) {
    this.rules = new Map();
    this.geoipService = geoipService;
  }

  /**
   * Add geo-blocking rule
   */
  addRule(rule: GeoBlockingRule): void {
    const tenantRules = this.rules.get(rule.tenant_id) || [];
    tenantRules.push(rule);
    this.rules.set(rule.tenant_id, tenantRules);
  }

  /**
   * Remove geo-blocking rule
   */
  removeRule(tenantId: string, ruleId: string): boolean {
    const tenantRules = this.rules.get(tenantId);
    if (!tenantRules) {
      return false;
    }

    const index = tenantRules.findIndex(r => r._id === ruleId);
    if (index === -1) {
      return false;
    }

    tenantRules.splice(index, 1);
    return true;
  }

  /**
   * Check if IP is blocked for tenant
   */
  async isBlocked(tenantId: string, ipAddress: string): Promise<{
    blocked: boolean;
    reason?: string;
    country?: string;
  }> {
    const tenantRules = this.rules.get(tenantId);
    if (!tenantRules || tenantRules.length === 0) {
      return { blocked: false };
    }

    // Lookup IP location
    const geoResult = await this.geoipService.lookup(ipAddress);
    if (!geoResult) {
      // Can't determine location - allow by default
      return { blocked: false };
    }

    // Check rules
    for (const rule of tenantRules) {
      if (!rule.is_active) {
        continue;
      }

      const countryMatch = rule.countries.includes(geoResult.country_code);

      if (rule.rule_type === 'deny' && countryMatch) {
        return {
          blocked: true,
          reason: `Access denied from ${geoResult.country_name}`,
          country: geoResult.country_code,
        };
      }

      if (rule.rule_type === 'allow' && !countryMatch) {
        return {
          blocked: true,
          reason: `Access only allowed from: ${rule.countries.join(', ')}`,
          country: geoResult.country_code,
        };
      }
    }

    return { blocked: false };
  }

  /**
   * Get rules for tenant
   */
  getRules(tenantId: string): GeoBlockingRule[] {
    return this.rules.get(tenantId) || [];
  }

  /**
   * Load rules from database
   */
  async loadFromDatabase(db: any): Promise<void> {
    const rules = await db.collection('geo_rules').find({}).toArray();
    
    for (const rule of rules) {
      this.addRule(rule);
    }
  }
}
