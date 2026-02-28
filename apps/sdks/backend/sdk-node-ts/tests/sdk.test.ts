import { describe, it, expect, vi } from 'vitest';
import { CaasNodeSdk } from '../src/index';

describe('CaasNodeSdk', () => {
  it('sends canonical headers for session create', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      access_token: 'a',
      refresh_token: 'r',
      expires_in: 900,
      token_type: 'Bearer',
    }), { status: 200, headers: { 'content-type': 'application/json' } }));

    const sdk = new CaasNodeSdk({
      gatewayBaseUrl: 'http://gateway:3000',
      apiKey: 'test-key',
      projectId: 'project-1',
      fetchImpl: fetchMock as any,
    });

    await sdk.createSession({ user_external_id: 'u1' });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['x-api-key']).toBe('test-key');
    expect(headers['x-project-id']).toBe('project-1');
    expect(headers['idempotency-key']).toContain('idem_');
  });
});
