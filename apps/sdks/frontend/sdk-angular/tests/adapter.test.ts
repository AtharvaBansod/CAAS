import { describe, expect, it } from 'vitest';
import { CaasAngularAdapter } from '../src/index';

class MockSdk {
  private listeners = new Map<string, Array<(payload: any) => void>>();
  connectCalls = 0;
  disconnectCalls = 0;
  getState() { return 'unauthenticated' as const; }
  on(event: 'stateChange' | 'socket:event' | 'error', listener: (payload: any) => void) {
    const list = this.listeners.get(event) || [];
    list.push(listener);
    this.listeners.set(event, list);
    return () => {
      this.listeners.set(event, (this.listeners.get(event) || []).filter((l) => l !== listener));
    };
  }
  emit(event: string, payload: any) {
    for (const listener of this.listeners.get(event) || []) listener(payload);
  }
  connectSocket() { this.connectCalls += 1; }
  disconnectSocket() { this.disconnectCalls += 1; }
}

describe('sdk-angular adapter', () => {
  it('emits state updates through observable', async () => {
    const sdk = new MockSdk();
    const adapter = new CaasAngularAdapter({ sdk });

    let current = 'unauthenticated';
    const sub = adapter.state$.subscribe((value) => {
      current = value;
    });

    sdk.emit('stateChange', { next: 'connected' });
    expect(current).toBe('connected');

    sub.unsubscribe();
    adapter.destroy();
  });

  it('does not auto-connect during SSR execution', () => {
    const sdk = new MockSdk();
    const originalWindow = (globalThis as any).window;
    try {
      delete (globalThis as any).window;
      const adapter = new CaasAngularAdapter({ sdk, autoConnect: true });
      expect(sdk.connectCalls).toBe(0);
      adapter.destroy();
      expect(sdk.disconnectCalls).toBe(0);
    } finally {
      if (originalWindow !== undefined) {
        (globalThis as any).window = originalWindow;
      }
    }
  });
});
