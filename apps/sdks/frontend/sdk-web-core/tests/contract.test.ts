import { describe, expect, it, vi } from 'vitest';
import { SdkRequestError, WebSdkCore } from '../src/sdk-core';
import type { SocketLike } from '../src/types';

type MockSocketControl = {
    socket: SocketLike;
    emitSpy: ReturnType<typeof vi.fn>;
    trigger: (event: string, payload?: unknown) => void;
};

function createMockSocketControl(): MockSocketControl {
    const handlers = new Map<string, (...args: any[]) => void>();
    const emitSpy = vi.fn();

    const socket: SocketLike = {
        connected: false,
        connect: () => {
            socket.connected = true;
            handlers.get('connect')?.();
        },
        disconnect: () => {
            socket.connected = false;
            handlers.get('disconnect')?.('client disconnect');
        },
        emit: emitSpy,
        on: (event, listener) => {
            handlers.set(event, listener);
        },
        off: (event) => {
            handlers.delete(event);
        },
    };

    return {
        socket,
        emitSpy,
        trigger: (event, payload) => {
            handlers.get(event)?.(payload);
        },
    };
}

describe('WebSdkCore contract', () => {
    it('sends required headers for session creation and reaches connected state', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
            access_token: 'access_1',
            refresh_token: 'refresh_1',
            expires_in: 900,
            token_type: 'Bearer',
            user: {
                user_id: 'u1',
                external_id: 'ext-1',
                tenant_id: 'tenant-1',
                project_id: 'project-1',
            },
            socket_urls: ['ws://socket:3001'],
        }), { status: 200, headers: { 'content-type': 'application/json' } }));

        const mockSocket = createMockSocketControl();

        const sdk = new WebSdkCore({
            gatewayBaseUrl: 'http://gateway:3000',
            socketBaseUrl: 'ws://socket:3001',
            fetchImpl: fetchMock,
            socketFactory: () => mockSocket.socket,
        });

        await sdk.createSession(
            { user_external_id: 'ext-1' },
            {
                apiKey: 'key_123',
                projectId: 'project-1',
                correlationId: 'corr-1',
                idempotencyKey: 'idem-1',
                signedHeaders: {
                    timestamp: '1772199999',
                    nonce: 'nonce-contract-test',
                    signature: 'sig-contract-test',
                },
            }
        );

        const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        const headers = init.headers as Record<string, string>;
        expect(headers['x-api-key']).toBe('key_123');
        expect(headers['x-project-id']).toBe('project-1');
        expect(headers['x-correlation-id']).toBe('corr-1');
        expect(headers['idempotency-key']).toBe('idem-1');
        expect(headers['x-timestamp']).toBe('1772199999');
        expect(headers['x-nonce']).toBe('nonce-contract-test');
        expect(headers['x-signature']).toBe('sig-contract-test');
        expect(sdk.getState()).toBe('connected');
    });

    it('moves back to unauthenticated state for invalid session token flow', async () => {
        const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({
            error: 'Invalid API key scope',
            code: 'project_scope_violation',
        }), { status: 401, headers: { 'content-type': 'application/json' } })));

        const mockSocket = createMockSocketControl();

        const sdk = new WebSdkCore({
            gatewayBaseUrl: 'http://gateway:3000',
            socketBaseUrl: 'ws://socket:3001',
            fetchImpl: fetchMock,
            socketFactory: () => mockSocket.socket,
        });

        try {
            await sdk.createSession({ user_external_id: 'ext-2' }, { apiKey: 'bad_key' });
        } catch (error) {
            expect(error).toBeInstanceOf(SdkRequestError);
            const sdkError = error as SdkRequestError;
            expect(sdkError.message).toContain('Invalid API key scope');
            expect(sdkError.code).toBe('project_scope_violation');
            expect(sdkError.retryable).toBe(false);
        }

        expect(sdk.getState()).toBe('unauthenticated');
    });

    it('queues outbound events offline and replays once on connect without duplicates', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
            access_token: 'access_2',
            refresh_token: 'refresh_2',
            expires_in: 900,
            token_type: 'Bearer',
            user: {
                user_id: 'u2',
                external_id: 'ext-2',
                tenant_id: 'tenant-2',
                project_id: 'project-2',
            },
        }), { status: 200, headers: { 'content-type': 'application/json' } }));

        const mockSocket = createMockSocketControl();
        const sdk = new WebSdkCore({
            gatewayBaseUrl: 'http://gateway:3000',
            socketBaseUrl: 'ws://socket:3001',
            fetchImpl: fetchMock,
            socketFactory: () => mockSocket.socket,
            offlineQueue: { enabled: true },
        });

        await sdk.createSession({ user_external_id: 'ext-2' }, { apiKey: 'key_456' });
        sdk.emitSocketEvent('sendMessage', { conversationId: 'c1', messageContent: 'hi' }, { eventId: 'evt-1' });
        expect(mockSocket.emitSpy).not.toHaveBeenCalled();

        sdk.connectSocket('chat');
        expect(mockSocket.emitSpy).toHaveBeenCalledTimes(1);

        sdk.emitSocketEvent('sendMessage', { conversationId: 'c1', messageContent: 'hi' }, { eventId: 'evt-1' });
        expect(mockSocket.emitSpy).toHaveBeenCalledTimes(1);
    });

    it('reports unsupported outbound events and sequence gaps', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
            access_token: 'access_3',
            refresh_token: 'refresh_3',
            expires_in: 900,
            token_type: 'Bearer',
            user: {
                user_id: 'u3',
                external_id: 'ext-3',
                tenant_id: 'tenant-3',
            },
        }), { status: 200, headers: { 'content-type': 'application/json' } }));

        const onGap = vi.fn();
        const mockSocket = createMockSocketControl();
        const sdk = new WebSdkCore({
            gatewayBaseUrl: 'http://gateway:3000',
            socketBaseUrl: 'ws://socket:3001',
            fetchImpl: fetchMock,
            socketFactory: () => mockSocket.socket,
            offlineQueue: { enabled: true, onSequenceGap: onGap },
        });

        const errors: Array<{ type: string }> = [];
        sdk.on('error', (payload) => {
            if (payload && typeof payload === 'object') {
                errors.push(payload as { type: string });
            }
        });

        await sdk.createSession({ user_external_id: 'ext-3' }, { apiKey: 'key_789' });
        sdk.connectSocket('chat');

        sdk.emitSocketEvent('bad_event_name', { foo: 'bar' });
        expect(errors.some((entry) => entry.type === 'socket_emit_error')).toBe(true);

        mockSocket.trigger('message', { sequence: 1, content: 'a' });
        mockSocket.trigger('message', { sequence: 4, content: 'b' });
        expect(onGap).toHaveBeenCalledTimes(1);
    });

    it('discovers sdk capabilities and health endpoints', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({
                session: { create: true, refresh: true, logout: true },
                headers: { required: ['x-api-key'] },
            }), { status: 200, headers: { 'content-type': 'application/json' } }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                status: 'ok',
                service: 'sdk-gateway',
                dependencies: { auth_client_circuit: 'CLOSED' },
            }), { status: 200, headers: { 'content-type': 'application/json' } }));

        const sdk = new WebSdkCore({
            gatewayBaseUrl: 'http://gateway:3000',
            socketBaseUrl: 'ws://socket:3001',
            fetchImpl: fetchMock,
            socketFactory: () => createMockSocketControl().socket,
        });

        const capabilities = await sdk.discoverCapabilities({ apiKey: 'key_123', correlationId: 'corr-2' });
        expect(capabilities.session.create).toBe(true);

        const health = await sdk.healthCheck();
        expect(health.status).toBe('ok');
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('blocks browser api-key session bootstrap unless explicitly enabled', async () => {
        const fetchMock = vi.fn();
        const originalWindow = (globalThis as any).window;
        (globalThis as any).window = {};

        try {
            const sdk = new WebSdkCore({
                gatewayBaseUrl: 'http://gateway:3000',
                socketBaseUrl: 'ws://socket:3001',
                fetchImpl: fetchMock,
                socketFactory: () => createMockSocketControl().socket,
            });

            await expect(
                sdk.createSession({ user_external_id: 'ext-browser' }, { apiKey: 'key_browser' })
            ).rejects.toBeInstanceOf(SdkRequestError);
            expect(fetchMock).not.toHaveBeenCalled();
        } finally {
            if (typeof originalWindow === 'undefined') {
                delete (globalThis as any).window;
            } else {
                (globalThis as any).window = originalWindow;
            }
        }
    });

    it('retries transient HTTP failures with bounded retry policy', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'degraded' }), { status: 503, headers: { 'content-type': 'application/json' } }))
            .mockResolvedValueOnce(new Response(JSON.stringify({ status: 'degraded' }), { status: 503, headers: { 'content-type': 'application/json' } }))
            .mockResolvedValueOnce(new Response(JSON.stringify({
                status: 'ok',
                service: 'sdk-gateway',
            }), { status: 200, headers: { 'content-type': 'application/json' } }));

        const sdk = new WebSdkCore({
            gatewayBaseUrl: 'http://gateway:3000',
            socketBaseUrl: 'ws://socket:3001',
            fetchImpl: fetchMock,
            socketFactory: () => createMockSocketControl().socket,
            httpRetry: {
                maxRetries: 2,
                baseDelayMs: 0,
                maxDelayMs: 0,
            },
        });

        const health = await sdk.healthCheck();
        expect(health.status).toBe('ok');
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it('applies offline discard policy and preserves persisted queue replay', async () => {
        const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({
            access_token: 'access-queue',
            refresh_token: 'refresh-queue',
            expires_in: 900,
            token_type: 'Bearer',
            user: {
                user_id: 'uq',
                external_id: 'ext-q',
                tenant_id: 'tenant-q',
            },
        }), { status: 200, headers: { 'content-type': 'application/json' } })));

        let persisted: any[] = [];
        const discardSpy = vi.fn();
        const mockSocketA = createMockSocketControl();
        const sdkA = new WebSdkCore({
            gatewayBaseUrl: 'http://gateway:3000',
            socketBaseUrl: 'ws://socket:3001',
            fetchImpl: fetchMock,
            socketFactory: () => mockSocketA.socket,
            offlineQueue: {
                enabled: true,
                maxItems: 1,
                discardPolicy: 'drop_newest',
                onDiscard: discardSpy,
                persistenceAdapter: {
                    load: () => persisted,
                    save: (items) => { persisted = items as any[]; },
                    clear: () => { persisted = []; },
                },
            },
        });

        await sdkA.createSession({ user_external_id: 'ext-q' }, { apiKey: 'key-q' });
        sdkA.emitSocketEvent('sendMessage', { text: 'first' }, { eventId: 'evt-first' });
        sdkA.emitSocketEvent('sendMessage', { text: 'second' }, { eventId: 'evt-second' });

        expect(discardSpy).toHaveBeenCalledTimes(1);
        expect(persisted.length).toBe(1);
        expect(persisted[0].event_id).toBe('evt-first');

        const mockSocketB = createMockSocketControl();
        const sdkB = new WebSdkCore({
            gatewayBaseUrl: 'http://gateway:3000',
            socketBaseUrl: 'ws://socket:3001',
            fetchImpl: fetchMock,
            socketFactory: () => mockSocketB.socket,
            offlineQueue: {
                enabled: true,
                persistenceAdapter: {
                    load: () => persisted,
                    save: (items) => { persisted = items as any[]; },
                    clear: () => { persisted = []; },
                },
            },
        });

        await sdkB.createSession({ user_external_id: 'ext-q-2' }, { apiKey: 'key-q-2' });
        sdkB.connectSocket('chat');

        expect(mockSocketB.emitSpy).toHaveBeenCalledTimes(1);
        const replayPayload = mockSocketB.emitSpy.mock.calls[0][1] as Record<string, unknown>;
        expect(replayPayload.client_event_id).toBe('evt-first');
        expect(replayPayload.replayed).toBe(true);
    });

    it('emits replay conflict callback for duplicate client_event_id acknowledgements', async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
            access_token: 'access-ack',
            refresh_token: 'refresh-ack',
            expires_in: 900,
            token_type: 'Bearer',
            user: {
                user_id: 'ua',
                external_id: 'ext-a',
                tenant_id: 'tenant-a',
            },
        }), { status: 200, headers: { 'content-type': 'application/json' } }));

        const conflictSpy = vi.fn();
        const mockSocket = createMockSocketControl();
        const sdk = new WebSdkCore({
            gatewayBaseUrl: 'http://gateway:3000',
            socketBaseUrl: 'ws://socket:3001',
            fetchImpl: fetchMock,
            socketFactory: () => mockSocket.socket,
            offlineQueue: {
                enabled: true,
                onReplayConflict: conflictSpy,
            },
        });

        await sdk.createSession({ user_external_id: 'ext-a' }, { apiKey: 'key-a' });
        sdk.connectSocket('chat');

        mockSocket.trigger('message', { client_event_id: 'evt-dup', sequence: 1 });
        mockSocket.trigger('message', { client_event_id: 'evt-dup', sequence: 2 });

        expect(conflictSpy).toHaveBeenCalledTimes(1);
        expect(conflictSpy).toHaveBeenCalledWith({
            event_id: 'evt-dup',
            namespace: 'chat',
            reason: 'duplicate_ack',
        });
    });
});
