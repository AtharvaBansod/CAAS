// Main entry point for the messaging service - HTTP API Server
import { createServer } from './server.js';
import { loadConfig } from './config/index.js';

async function main() {
  try {
    const config = loadConfig();
    const server = await createServer();

    await server.listen({
      port: config.port,
      host: '0.0.0.0',
    });

    server.log.info(`Messaging service listening on port ${config.port}`);
  } catch (error) {
    console.error('Failed to start messaging service:', error);
    process.exit(1);
  }
}

main();
