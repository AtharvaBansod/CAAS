import { getConnectionManager } from './connections';

/**
 * Health check script for MongoDB service
 */
async function healthCheck(): Promise<boolean> {
  try {
    const connectionManager = getConnectionManager();
    
    // Check if connected
    if (!connectionManager.isConnected()) {
      console.error('❌ MongoDB not connected');
      return false;
    }
    
    // Test database operation
    const connection = connectionManager.getConnection();
    await connection.db('admin').command({ ping: 1 });
    
    console.log('✅ MongoDB health check passed');
    return true;
  } catch (error) {
    console.error('❌ MongoDB health check failed:', error);
    return false;
  }
}

// Run health check if this file is executed directly
if (require.main === module) {
  healthCheck()
    .then((healthy) => {
      process.exit(healthy ? 0 : 1);
    })
    .catch((error) => {
      console.error('Health check error:', error);
      process.exit(1);
    });
}

export { healthCheck };
