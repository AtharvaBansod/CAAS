/**
 * Encryption Mode Configuration
 * Manages encryption mode per tenant
 */

import { EncryptionMode, EncryptionConfig } from './types';

export class EncryptionModeService {
  private configs: Map<string, EncryptionConfig> = new Map();
  private readonly DEFAULT_MODE: EncryptionMode = 'CLIENT_E2E';

  /**
   * Set encryption mode for tenant
   */
  async setEncryptionMode(
    tenantId: string,
    mode: EncryptionMode
  ): Promise<void> {
    const config: EncryptionConfig = {
      mode,
      tenant_id: tenantId,
      enabled: true,
    };

    this.configs.set(tenantId, config);
  }

  /**
   * Get encryption mode for tenant
   */
  async getEncryptionMode(tenantId: string): Promise<EncryptionMode> {
    const config = this.configs.get(tenantId);
    return config?.mode || this.DEFAULT_MODE;
  }

  /**
   * Get encryption config
   */
  async getEncryptionConfig(tenantId: string): Promise<EncryptionConfig> {
    return (
      this.configs.get(tenantId) || {
        mode: this.DEFAULT_MODE,
        tenant_id: tenantId,
        enabled: true,
      }
    );
  }

  /**
   * Enable encryption for tenant
   */
  async enableEncryption(tenantId: string): Promise<void> {
    const config = await this.getEncryptionConfig(tenantId);
    config.enabled = true;
    this.configs.set(tenantId, config);
  }

  /**
   * Disable encryption for tenant
   */
  async disableEncryption(tenantId: string): Promise<void> {
    const config = await this.getEncryptionConfig(tenantId);
    config.enabled = false;
    this.configs.set(tenantId, config);
  }

  /**
   * Check if encryption is enabled
   */
  async isEncryptionEnabled(tenantId: string): Promise<boolean> {
    const config = await this.getEncryptionConfig(tenantId);
    return config.enabled;
  }

  /**
   * Check if client-side E2E is enabled
   */
  async isClientE2EEnabled(tenantId: string): Promise<boolean> {
    const config = await this.getEncryptionConfig(tenantId);
    return config.enabled && config.mode === 'CLIENT_E2E';
  }

  /**
   * Check if server-assisted encryption is enabled
   */
  async isServerAssistedEnabled(tenantId: string): Promise<boolean> {
    const config = await this.getEncryptionConfig(tenantId);
    return config.enabled && config.mode === 'SERVER_ASSISTED';
  }

  /**
   * Get all tenant configs
   */
  async getAllConfigs(): Promise<EncryptionConfig[]> {
    return Array.from(this.configs.values());
  }

  /**
   * Validate encryption mode
   */
  validateMode(mode: string): mode is EncryptionMode {
    return ['CLIENT_E2E', 'SERVER_ASSISTED', 'TRANSPORT_ONLY'].includes(mode);
  }
}

export const encryptionModeService = new EncryptionModeService();
