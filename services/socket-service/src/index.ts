import http from 'http';
import express from 'express';
import { createSocketServer } from './server';
import { registerChatNamespace } from './namespaces/chat';
import { registerPresenceNamespace } from './namespaces/presence';
import { registerWebRTCNamespace } from './namespaces/webrtc';
import { config } from './config';
import { socketMetrics } from './metrics/socket-metrics';

async function bootstrap() {
  const app = express();
  const httpServer = http.createServer(app);

  // Health check endpoint
  app.get('/health', async (req, res) => {
    try {
      const io = (httpServer as any).io;
      if (!io) {
        return res.status(503).json({ status: 'unhealthy', message: 'Socket server not initialized' });
      }

      const healthChecker = (io as any).healthChecker;
      const connectionTracker = (io as any).connectionTracker;

      if (!healthChecker) {
        return res.json({ status: 'healthy' });
      }

      const connectionCount = await connectionTracker?.getTotalConnectionCount() || socketMetrics.getConnectionCount();
      const health = await healthChecker.getOverallHealth(connectionCount);

      res.status(health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503).json(health);
    } catch (error: any) {
      res.status(503).json({ status: 'unhealthy', message: error.message });
    }
  });

  // Readiness probe
  app.get('/health/ready', async (req, res) => {
    try {
      const io = (httpServer as any).io;
      if (!io) {
        return res.status(503).json({ ready: false, message: 'Socket server not initialized' });
      }

      const healthChecker = (io as any).healthChecker;
      if (!healthChecker) {
        return res.json({ ready: true });
      }

      const redisHealth = await healthChecker.checkRedisConnection();
      const ready = redisHealth.status !== 'unhealthy';

      res.status(ready ? 200 : 503).json({ ready, redis: redisHealth });
    } catch (error: any) {
      res.status(503).json({ ready: false, message: error.message });
    }
  });

  // Liveness probe
  app.get('/health/live', (req, res) => {
    res.json({ alive: true });
  });

  // Metrics endpoint (Prometheus format)
  app.get('/metrics', (req, res) => {
    res.set('Content-Type', 'text/plain');
    res.send(socketMetrics.getMetrics());
  });

  // Metrics JSON endpoint
  app.get('/metrics/json', (req, res) => {
    res.json(socketMetrics.getMetricsJSON());
  });

  // Create Socket.IO server
  const io = await createSocketServer(httpServer);
  (httpServer as any).io = io;

  // Register namespaces
  registerChatNamespace(io);
  registerPresenceNamespace(io);
  registerWebRTCNamespace(io);

  httpServer.listen(config.port, () => {
    console.log(`Socket service listening on port ${config.port}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    httpServer.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
