export type AdapterConnectionState = 'unauthenticated' | 'token-refresh' | 'connected' | 'degraded' | 'disconnected';

export interface CoreSdkLike {
  getState(): AdapterConnectionState;
  on(event: 'stateChange' | 'socket:event' | 'error', listener: (payload: any) => void): () => void;
  connectSocket(namespace?: string): void;
  disconnectSocket(): void;
}

export interface ThemeTokens {
  accentColor?: string;
  borderRadiusPx?: number;
}

export interface SdkReactConfig {
  sdk: CoreSdkLike;
  namespace?: string;
  autoConnect?: boolean;
  theme?: ThemeTokens;
}
