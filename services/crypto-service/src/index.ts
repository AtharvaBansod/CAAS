/**
 * Crypto Service Entry Point
 */

import { masterKeyProvider } from './storage/master-key-provider';

// Export all modules
export * from './keys';
export * from './storage';
export * from './distribution';
export * from './rotation';
export * from './e2e';
export * from './verification';

/**
 * Initialize crypto service
 */
export async function initializeCryptoService(): Promise<void> {
  console.log('Initializing Crypto Service...');

  // Initialize master key provider
  await masterKeyProvider.initialize();

  console.log('Crypto Service initialized successfully');
  console.log('- Key Management: Ready');
  console.log('- Key Distribution: Ready');
  console.log('- Key Rotation: Ready');
  console.log('- Signal Protocol: Ready');
  console.log('- Message Encryption: Ready');
  console.log('- Group Encryption: Ready');
  console.log('- Safety Numbers: Ready');
}

/**
 * Shutdown crypto service
 */
export async function shutdownCryptoService(): Promise<void> {
  console.log('Shutting down Crypto Service...');

  // Cleanup scheduled rotations
  const { scheduledRotation } = require('./rotation/scheduled-rotation');
  scheduledRotation.cleanup();

  console.log('Crypto Service shutdown complete');
}

// Auto-initialize if run directly
if (require.main === module) {
  initializeCryptoService()
    .then(() => {
      console.log('Crypto Service is running');
    })
    .catch((error) => {
      console.error('Failed to start Crypto Service:', error);
      process.exit(1);
    });

  // Handle shutdown
  process.on('SIGINT', async () => {
    await shutdownCryptoService();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await shutdownCryptoService();
    process.exit(0);
  });
}
