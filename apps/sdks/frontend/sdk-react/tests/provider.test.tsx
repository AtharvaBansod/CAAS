import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { CaasProvider } from '../src/provider';

class MockSdk {
  getState() { return 'unauthenticated' as const; }
  on() { return () => {}; }
  connectSocket() {}
  disconnectSocket() {}
}

describe('sdk-react', () => {
  it('is SSR-safe during server render', () => {
    const html = renderToString(
      <CaasProvider config={{ sdk: new MockSdk(), autoConnect: true }}>
        <div>ok</div>
      </CaasProvider>
    );
    expect(html).toContain('ok');
  });
});
