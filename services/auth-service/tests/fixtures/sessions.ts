import { SessionInfo } from '../../src/sessions/multi-device-sync';

export const createMockSession = (overrides?: Partial<SessionInfo>): SessionInfo => {
  const defaults: SessionInfo = {
    sessionId: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId: 'test-user-123',
    deviceInfo: {
      deviceId: `device-${Math.random().toString(36).substr(2, 9)}`,
      deviceName: 'Test Device',
      deviceType: 'mobile',
      platform: 'iOS',
      lastActive: Date.now(),
      isPrimary: false,
    },
    createdAt: Date.now(),
    expiresAt: Date.now() + 86400000, // 24 hours
    metadata: {},
  };

  return { ...defaults, ...overrides };
};

export const createMockDeviceInfo = (overrides?: Partial<SessionInfo['deviceInfo']>) => {
  const defaults = {
    deviceId: `device-${Math.random().toString(36).substr(2, 9)}`,
    deviceName: 'Test Device',
    deviceType: 'mobile' as const,
    platform: 'iOS',
    lastActive: Date.now(),
    isPrimary: false,
  };

  return { ...defaults, ...overrides };
};

export const mockSessions = {
  mobileSession: createMockSession({
    deviceInfo: createMockDeviceInfo({
      deviceType: 'mobile',
      deviceName: 'iPhone 13',
      platform: 'iOS',
      isPrimary: true,
    }),
  }),

  desktopSession: createMockSession({
    deviceInfo: createMockDeviceInfo({
      deviceType: 'desktop',
      deviceName: 'MacBook Pro',
      platform: 'macOS',
      isPrimary: false,
    }),
  }),

  tabletSession: createMockSession({
    deviceInfo: createMockDeviceInfo({
      deviceType: 'tablet',
      deviceName: 'iPad Pro',
      platform: 'iPadOS',
      isPrimary: false,
    }),
  }),

  webSession: createMockSession({
    deviceInfo: createMockDeviceInfo({
      deviceType: 'web',
      deviceName: 'Chrome Browser',
      platform: 'Windows',
      isPrimary: false,
    }),
  }),
};

export const createMultipleSessionsForUser = (
  userId: string,
  count: number
): SessionInfo[] => {
  return Array.from({ length: count }, (_, index) =>
    createMockSession({
      userId,
      sessionId: `session-${userId}-${index}`,
      deviceInfo: createMockDeviceInfo({
        deviceId: `device-${userId}-${index}`,
        deviceName: `Device ${index + 1}`,
        isPrimary: index === 0,
      }),
    })
  );
};

export const createExpiredSession = (userId: string): SessionInfo => {
  return createMockSession({
    userId,
    createdAt: Date.now() - 86400000 * 2, // 2 days ago
    expiresAt: Date.now() - 86400000, // Expired 1 day ago
  });
};

export const createSessionWithMetadata = (
  userId: string,
  metadata: Record<string, any>
): SessionInfo => {
  return createMockSession({
    userId,
    metadata,
  });
};
