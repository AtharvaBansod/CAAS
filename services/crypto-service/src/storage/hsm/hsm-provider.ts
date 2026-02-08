/**
 * HSM Provider Interface
 * Interface for Hardware Security Module integration
 */

import { HSMProvider } from '../types';

export abstract class BaseHSMProvider implements HSMProvider {
  abstract getRootKey(): Promise<Buffer>;
  abstract sign(data: Buffer): Promise<Buffer>;
  abstract decrypt(data: Buffer): Promise<Buffer>;
  abstract encrypt(data: Buffer): Promise<Buffer>;

  /**
   * Verify signature
   */
  abstract verify(data: Buffer, signature: Buffer): Promise<boolean>;

  /**
   * Generate random bytes
   */
  abstract generateRandom(length: number): Promise<Buffer>;

  /**
   * Get HSM info
   */
  abstract getInfo(): Promise<{
    provider: string;
    version: string;
    available: boolean;
  }>;
}

/**
 * HSM Provider Factory
 */
export class HSMProviderFactory {
  static create(provider: string): HSMProvider {
    switch (provider.toLowerCase()) {
      case 'stub':
        return new (require('./stub-hsm').StubHSMProvider)();
      case 'aws-kms':
        // return new AWSKMSProvider();
        throw new Error('AWS KMS provider not implemented yet');
      case 'azure-keyvault':
        // return new AzureKeyVaultProvider();
        throw new Error('Azure Key Vault provider not implemented yet');
      default:
        throw new Error(`Unknown HSM provider: ${provider}`);
    }
  }
}
