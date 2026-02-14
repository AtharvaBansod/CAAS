import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TurnServerProvider } from '../../src/webrtc/turn-server-provider';
import { IceServerProvider } from '../../src/webrtc/ice-server-provider';

describe('WebRTC TURN Integration Tests', () => {
  let turnServerProvider: TurnServerProvider;
  let iceServerProvider: IceServerProvider;

  const TEST_TURN_CONFIG = {
    host: process.env.TURN_HOST || 'turn.example.com',
    port: parseInt(process.env.TURN_PORT || '3478'),
    secret: process.env.TURN_SECRET || 'test-secret',
    transport: 'udp' as const,
    ttl: 3600,
  };

  beforeAll(() => {
    turnServerProvider = new TurnServerProvider([TEST_TURN_CONFIG]);
    iceServerProvider = new IceServerProvider(turnServerProvider);
  });

  afterAll(() => {
    turnServerProvider.stopHealthChecks();
  });

  it('should generate TURN credentials', () => {
    const userId = 'user-001';
    const tenantId = 'tenant-001';

    const credentials = turnServerProvider.generateCredentials(userId, tenantId);

    expect(credentials).toBeDefined();
    expect(credentials.username).toContain(tenantId);
    expect(credentials.username).toContain(userId);
    expect(credentials.credential).toBeDefined();
    expect(credentials.urls).toHaveLength(1);
    expect(credentials.urls[0]).toContain('turn:');
  });

  it('should generate time-limited credentials', () => {
    const userId = 'user-001';
    const tenantId = 'tenant-001';

    const credentials = turnServerProvider.generateCredentials(userId, tenantId);
    const username = credentials.username;

    // Username format: timestamp:tenantId:userId
    const parts = username.split(':');
    expect(parts).toHaveLength(3);

    const timestamp = parseInt(parts[0]);
    const now = Math.floor(Date.now() / 1000);

    // Timestamp should be in the future (now + TTL)
    expect(timestamp).toBeGreaterThan(now);
    expect(timestamp).toBeLessThanOrEqual(now + TEST_TURN_CONFIG.ttl + 10);
  });

  it('should generate credentials for multiple servers', () => {
    const multiServerProvider = new TurnServerProvider([
      TEST_TURN_CONFIG,
      { ...TEST_TURN_CONFIG, host: 'turn2.example.com', port: 3479 },
    ]);

    const userId = 'user-001';
    const tenantId = 'tenant-001';

    const credentials = multiServerProvider.generateMultiServerCredentials(userId, tenantId);

    expect(credentials).toHaveLength(2);
    expect(credentials[0].urls[0]).toContain('turn.example.com');
    expect(credentials[1].urls[0]).toContain('turn2.example.com');

    multiServerProvider.stopHealthChecks();
  });

  it('should include TURN servers in ICE server list', async () => {
    const userId = 'user-001';
    const tenantId = 'tenant-001';

    const iceServers = await iceServerProvider.getIceServers(userId, tenantId);

    expect(iceServers.length).toBeGreaterThan(0);

    // Should have STUN servers
    const stunServer = iceServers.find((server) =>
      Array.isArray(server.urls)
        ? server.urls.some((url) => url.startsWith('stun:'))
        : server.urls.startsWith('stun:')
    );
    expect(stunServer).toBeDefined();

    // Should have TURN servers with credentials
    const turnServer = iceServers.find((server) =>
      Array.isArray(server.urls)
        ? server.urls.some((url) => url.startsWith('turn:'))
        : server.urls.startsWith('turn:')
    );
    expect(turnServer).toBeDefined();
    expect(turnServer?.username).toBeDefined();
    expect(turnServer?.credential).toBeDefined();
  });

  it('should track server health status', () => {
    const status = turnServerProvider.getServerStatus();

    expect(status).toHaveLength(1);
    expect(status[0].healthy).toBe(true);
    expect(status[0].config.host).toBe(TEST_TURN_CONFIG.host);
  });

  it('should handle unhealthy servers', () => {
    const serverId = 'turn-0';
    
    turnServerProvider.markUnhealthy(serverId);
    
    const status = turnServerProvider.getServerStatus();
    expect(status[0].healthy).toBe(false);

    // Should throw error when trying to generate credentials with no healthy servers
    expect(() => {
      turnServerProvider.generateCredentials('user-001', 'tenant-001');
    }).toThrow('No healthy TURN servers available');

    // Mark healthy again
    turnServerProvider.markHealthy(serverId);
  });

  it('should support failover between TURN servers', () => {
    const multiServerProvider = new TurnServerProvider([
      TEST_TURN_CONFIG,
      { ...TEST_TURN_CONFIG, host: 'turn2.example.com', port: 3479 },
    ]);

    // Mark first server as unhealthy
    multiServerProvider.markUnhealthy('turn-0');

    const userId = 'user-001';
    const tenantId = 'tenant-001';

    // Should still be able to generate credentials using second server
    const credentials = multiServerProvider.generateCredentials(userId, tenantId);
    expect(credentials).toBeDefined();
    expect(credentials.urls[0]).toContain('turn2.example.com');

    multiServerProvider.stopHealthChecks();
  });

  it('should add and remove TURN servers dynamically', () => {
    const newConfig = {
      host: 'turn3.example.com',
      port: 3480,
      secret: 'test-secret',
      transport: 'tcp' as const,
    };

    const serverId = turnServerProvider.addServer(newConfig);
    expect(serverId).toBeDefined();

    let status = turnServerProvider.getServerStatus();
    expect(status.length).toBe(2);

    const removed = turnServerProvider.removeServer(serverId);
    expect(removed).toBe(true);

    status = turnServerProvider.getServerStatus();
    expect(status.length).toBe(1);
  });

  it('should provide usage metrics', () => {
    const metrics = turnServerProvider.getMetrics();

    expect(metrics.totalServers).toBeGreaterThan(0);
    expect(metrics.healthyServers).toBeGreaterThanOrEqual(0);
    expect(metrics.unhealthyServers).toBeGreaterThanOrEqual(0);
    expect(metrics.totalServers).toBe(metrics.healthyServers + metrics.unhealthyServers);
  });

  it('should support different transport protocols', () => {
    const udpConfig = { ...TEST_TURN_CONFIG, transport: 'udp' as const };
    const tcpConfig = { ...TEST_TURN_CONFIG, transport: 'tcp' as const, port: 3479 };
    const tlsConfig = { ...TEST_TURN_CONFIG, transport: 'tls' as const, port: 5349 };

    const provider = new TurnServerProvider([udpConfig, tcpConfig, tlsConfig]);

    const credentials = provider.generateMultiServerCredentials('user-001', 'tenant-001');

    expect(credentials[0].urls[0]).toContain('transport=udp');
    expect(credentials[1].urls[0]).toContain('transport=tcp');
    expect(credentials[2].urls[0]).toContain('turns:'); // TLS uses turns:

    provider.stopHealthChecks();
  });
});
