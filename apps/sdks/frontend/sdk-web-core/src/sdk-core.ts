import { io } from 'socket.io-client';
import { ConnectionStateMachine } from './state-machine';
import {
    DEFAULT_OUTBOUND_EVENT_ALLOWLIST,
    DEFAULT_SOCKET_EVENT_MAP,
    type CoreEventMap,
    type FetchLike,
    type HttpRetryConfig,
    type OfflineQueueItem,
    type OutboundSocketEvent,
    type SdkConnectionState,
    type SessionAuthContext,
    type SessionCreatePayload,
    type SessionCreateResult,
    type SessionRefreshResult,
    type SdkCapabilities,
    type SessionTokenBundle,
    type SdkHealth,
    type SocketFactory,
    type SocketLike,
    type SdkCoreOptions,
} from './types';

type CoreEvent =
    | 'stateChange'
    | 'error'
    | 'socket:connected'
    | 'socket:disconnected'
    | 'socket:event'
    | 'reconciliation';

type Listener = (payload?: any) => void;

const DEFAULT_RECONNECT_DELAY_MS = 1500;
const DEFAULT_OFFLINE_QUEUE_MAX_ITEMS = 200;
const DEFAULT_OFFLINE_REPLAY_WINDOW_MS = 5 * 60 * 1000;
const DEFAULT_RETRY_STATUSES = [429, 500, 502, 503, 504];
const DEFAULT_RETRY_BASE_DELAY_MS = 180;
const DEFAULT_RETRY_MAX_DELAY_MS = 2500;

export class SdkRequestError extends Error {
    readonly status?: number;
    readonly code: string;
    readonly endpoint: string;
    readonly retryable: boolean;
    readonly details?: unknown;

    constructor(params: {
        message: string;
        code: string;
        endpoint: string;
        retryable: boolean;
        status?: number;
        details?: unknown;
    }) {
        super(params.message);
        this.name = 'SdkRequestError';
        this.status = params.status;
        this.code = params.code;
        this.endpoint = params.endpoint;
        this.retryable = params.retryable;
        this.details = params.details;
    }
}

export class WebSdkCore {
    private readonly options: SdkCoreOptions;
    private readonly stateMachine = new ConnectionStateMachine();
    private readonly fetchImpl: FetchLike;
    private readonly socketFactory: SocketFactory;
    private readonly listeners = new Map<CoreEvent, Set<Listener>>();
    private readonly socketEventMap: CoreEventMap = DEFAULT_SOCKET_EVENT_MAP;
    private readonly outboundEventAllowlist: Set<string>;

    private sessionTokens: SessionTokenBundle | null = null;
    private socket: SocketLike | null = null;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private activeNamespace = 'chat';
    private readonly offlineQueue: OfflineQueueItem[] = [];
    private readonly sentEventIds = new Set<string>();
    private readonly acknowledgedEventIds = new Set<string>();
    private readonly lastSequenceByNamespace = new Map<keyof CoreEventMap, number>();

    constructor(options: SdkCoreOptions) {
        this.options = options;
        this.fetchImpl = options.fetchImpl || fetch.bind(globalThis);
        this.socketFactory = options.socketFactory || ((url, socketOptions) => io(url, socketOptions));
        this.outboundEventAllowlist = new Set<string>(options.outboundEventAllowlist || DEFAULT_OUTBOUND_EVENT_ALLOWLIST);
        this.restoreOfflineQueue();
    }

    getState(): SdkConnectionState {
        return this.stateMachine.getState();
    }

    getEventMap(): CoreEventMap {
        return this.socketEventMap;
    }

    on(event: CoreEvent, listener: Listener): () => void {
        const eventListeners = this.listeners.get(event) || new Set<Listener>();
        eventListeners.add(listener);
        this.listeners.set(event, eventListeners);
        return () => this.off(event, listener);
    }

    off(event: CoreEvent, listener: Listener): void {
        const eventListeners = this.listeners.get(event);
        if (!eventListeners) return;
        eventListeners.delete(listener);
    }

    async createSession(payload: SessionCreatePayload, auth: SessionAuthContext): Promise<SessionCreateResult> {
        if (typeof window !== 'undefined' && !this.options.allowBrowserApiKey) {
            throw new SdkRequestError({
                message: 'createSession with API key is disabled in browser runtime',
                code: 'validation_error',
                endpoint: '/api/v1/sdk/session',
                retryable: false,
            });
        }

        this.transition('BOOTSTRAP');
        const signedHeaders = auth.signedHeaders || this.options.signedHeadersProvider?.();

        const endpoint = '/api/v1/sdk/session';
        const response = await this.fetchWithRetry(
            `${this.options.gatewayBaseUrl}${endpoint}`,
            {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-api-key': auth.apiKey,
                    'x-correlation-id': auth.correlationId || this.createCorrelationId(),
                    'idempotency-key': auth.idempotencyKey || this.createIdempotencyKey(),
                    ...(auth.projectId ? { 'x-project-id': auth.projectId } : {}),
                    ...(auth.userAgent ? { 'user-agent': auth.userAgent } : {}),
                    ...(signedHeaders ? {
                        'x-timestamp': signedHeaders.timestamp,
                        'x-nonce': signedHeaders.nonce,
                    } : {}),
                    ...(signedHeaders?.signature ? { 'x-signature': signedHeaders.signature } : {}),
                },
                body: JSON.stringify({
                    ...payload,
                    ...(auth.projectId ? { project_id: auth.projectId } : {}),
                }),
            },
            {
                endpoint,
                retryNonIdempotent: false,
                idempotentKeyPresent: true,
            }
        );

        if (!response.ok) {
            this.transition('AUTH_REQUIRED');
            const sdkError = await this.toSdkError(response, endpoint);
            this.emit('error', {
                type: 'session_create_error',
                message: sdkError.message,
                status: sdkError.status,
                code: sdkError.code,
            });
            throw sdkError;
        }

        const data = await response.json() as SessionCreateResult;
        this.sessionTokens = {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            expires_in: data.expires_in,
            token_type: data.token_type,
        };
        this.transition('CONNECT');
        return data;
    }

    async refreshSession(): Promise<SessionRefreshResult> {
        if (!this.sessionTokens?.refresh_token) {
            this.transition('AUTH_REQUIRED');
            const message = 'Cannot refresh session without refresh_token';
            this.emit('error', { type: 'token_refresh_error', message });
            throw new SdkRequestError({
                message,
                code: 'context_missing',
                endpoint: '/api/v1/sdk/refresh',
                retryable: false,
            });
        }

        this.transition('REFRESH');
        const endpoint = '/api/v1/sdk/refresh';
        const response = await this.fetchWithRetry(
            `${this.options.gatewayBaseUrl}${endpoint}`,
            {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-correlation-id': this.createCorrelationId(),
                    'idempotency-key': this.createIdempotencyKey(),
                },
                body: JSON.stringify({ refresh_token: this.sessionTokens.refresh_token }),
            },
            {
                endpoint,
                retryNonIdempotent: false,
                idempotentKeyPresent: true,
            }
        );

        if (!response.ok) {
            this.transition('AUTH_REQUIRED');
            const sdkError = await this.toSdkError(response, endpoint);
            this.emit('error', {
                type: 'token_refresh_error',
                message: sdkError.message,
                status: sdkError.status,
                code: sdkError.code,
            });
            throw sdkError;
        }

        const data = await response.json() as SessionRefreshResult;
        this.sessionTokens = data;
        this.transition('CONNECT');
        return data;
    }

    async logoutSession(): Promise<void> {
        if (!this.sessionTokens?.access_token) {
            this.transition('AUTH_REQUIRED');
            return;
        }

        const endpoint = '/api/v1/sdk/logout';
        const response = await this.fetchWithRetry(
            `${this.options.gatewayBaseUrl}${endpoint}`,
            {
                method: 'POST',
                headers: {
                    authorization: `Bearer ${this.sessionTokens.access_token}`,
                    'x-correlation-id': this.createCorrelationId(),
                },
            },
            {
                endpoint,
                retryNonIdempotent: false,
                idempotentKeyPresent: false,
            }
        );
        if (!response.ok) {
            throw await this.toSdkError(response, endpoint);
        }

        this.sessionTokens = null;
        this.disconnectSocket();
        this.sentEventIds.clear();
        this.acknowledgedEventIds.clear();
        this.offlineQueue.length = 0;
        this.persistOfflineQueue();
        this.transition('AUTH_REQUIRED');
    }

    async discoverCapabilities(auth: Pick<SessionAuthContext, 'apiKey' | 'correlationId'>): Promise<SdkCapabilities> {
        const endpoint = '/api/v1/sdk/capabilities';
        const response = await this.fetchWithRetry(
            `${this.options.gatewayBaseUrl}${endpoint}`,
            {
                method: 'GET',
                headers: {
                    'x-api-key': auth.apiKey,
                    'x-correlation-id': auth.correlationId || this.createCorrelationId(),
                },
            },
            { endpoint, retryNonIdempotent: true, idempotentKeyPresent: true }
        );

        if (!response.ok) {
            throw await this.toSdkError(response, endpoint);
        }

        return response.json() as Promise<SdkCapabilities>;
    }

    async healthCheck(): Promise<SdkHealth> {
        const endpoint = '/api/v1/sdk/health';
        const response = await this.fetchWithRetry(
            `${this.options.gatewayBaseUrl}${endpoint}`,
            { method: 'GET' },
            { endpoint, retryNonIdempotent: true, idempotentKeyPresent: true }
        );
        if (!response.ok) {
            throw await this.toSdkError(response, endpoint);
        }
        return response.json() as Promise<SdkHealth>;
    }

    connectSocket(namespace: keyof CoreEventMap = 'chat'): void {
        const accessToken = this.sessionTokens?.access_token;
        if (!accessToken) {
            this.transition('AUTH_REQUIRED');
            this.emit('error', { type: 'socket_connect_error', message: 'Missing access token' });
            return;
        }

        this.activeNamespace = namespace;
        if (this.socket) {
            if (this.socket.connected) {
                this.transition('CONNECT');
                return;
            }
            this.socket.disconnect();
            this.socket = null;
        }

        const socketUrl = `${this.options.socketBaseUrl}/${namespace}`;
        this.socket = this.socketFactory(socketUrl, {
            auth: { token: accessToken },
            transports: ['websocket'],
            autoConnect: false,
        });

        this.socket.on('connect', () => {
            this.clearReconnectTimer();
            this.transition('CONNECT');
            this.emit('socket:connected', { namespace });
            this.flushOfflineQueue();
        });

        this.socket.on('disconnect', (reason?: string) => {
            if (reason === 'io server disconnect') {
                this.transition('DISCONNECT');
            } else {
                this.transition('DEGRADE');
                this.scheduleReconnect();
            }
            this.emit('socket:disconnected', { namespace, reason });
        });

        this.socket.on('connect_error', (error: Error) => {
            this.transition('DEGRADE');
            this.emit('error', { type: 'socket_connect_error', message: error.message });
            this.scheduleReconnect();
        });

        for (const eventName of this.socketEventMap[namespace]) {
            this.socket.on(eventName, (payload: unknown) => {
                const conflictHandled = this.handleReplayConflict(namespace, payload);
                if (conflictHandled) {
                    return;
                }
                this.handleSequenceProgress(namespace, payload);
                this.emit('socket:event', { namespace, eventName, payload });
            });
        }

        this.socket.connect();
    }

    disconnectSocket(): void {
        this.clearReconnectTimer();
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.transition('DISCONNECT');
    }

    emitSocketEvent(
        eventName: OutboundSocketEvent | string,
        payload: unknown,
        options?: { eventId?: string; idempotencyKey?: string; allowOfflineQueue?: boolean }
    ): void {
        if (!this.outboundEventAllowlist.has(eventName)) {
            this.emit('error', {
                type: 'socket_emit_error',
                message: `Unsupported outbound event: ${eventName}`,
            });
            return;
        }

        const eventId = options?.eventId || this.createEventId();
        const idempotencyKey = options?.idempotencyKey || this.createIdempotencyKey();

        if (this.sentEventIds.has(eventId)) {
            return;
        }

        if (!this.socket || !this.socket.connected) {
            this.transition('DEGRADE');
            if ((options?.allowOfflineQueue ?? true) && this.options.offlineQueue?.enabled) {
                this.enqueueOfflineEvent({
                    event_id: eventId,
                    event_name: eventName,
                    payload,
                    queued_at: Date.now(),
                    idempotency_key: idempotencyKey,
                });
                return;
            }
            this.emit('error', { type: 'socket_emit_error', message: 'Socket is not connected' });
            return;
        }

        this.sentEventIds.add(eventId);
        this.socket.emit?.(eventName, {
            ...(typeof payload === 'object' && payload !== null ? payload as Record<string, unknown> : { payload }),
            client_event_id: eventId,
            idempotency_key: idempotencyKey,
        });
    }

    private scheduleReconnect(): void {
        if (this.reconnectTimer) return;
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (this.getState() === 'degraded') {
                this.connectSocket(this.activeNamespace as keyof CoreEventMap);
            }
        }, this.options.reconnectDelayMs || DEFAULT_RECONNECT_DELAY_MS);
    }

    private clearReconnectTimer(): void {
        if (!this.reconnectTimer) return;
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
    }

    private transition(event: 'BOOTSTRAP' | 'REFRESH' | 'CONNECT' | 'DEGRADE' | 'DISCONNECT' | 'AUTH_REQUIRED') {
        const previous = this.stateMachine.getState();
        const next = this.stateMachine.transition(event);
        if (next !== previous) {
            this.emit('stateChange', { previous, next, event });
        }
    }

    private emit(event: CoreEvent, payload?: unknown) {
        const eventListeners = this.listeners.get(event);
        if (!eventListeners) return;
        for (const listener of eventListeners) {
            listener(payload);
        }
    }

    private enqueueOfflineEvent(item: OfflineQueueItem): void {
        const maxItems = this.options.offlineQueue?.maxItems || DEFAULT_OFFLINE_QUEUE_MAX_ITEMS;
        if (this.offlineQueue.length >= maxItems) {
            const discardPolicy = this.options.offlineQueue?.discardPolicy || 'drop_oldest';
            if (discardPolicy === 'drop_newest') {
                this.options.offlineQueue?.onDiscard?.(item);
                this.options.offlineQueue?.onQueueOverflow?.(item);
                return;
            }

            const dropped = this.offlineQueue.shift();
            if (dropped) {
                this.options.offlineQueue?.onDiscard?.(dropped);
                this.options.offlineQueue?.onQueueOverflow?.(dropped);
            }
        }
        this.offlineQueue.push(item);
        this.persistOfflineQueue();
    }

    private flushOfflineQueue(): void {
        if (!this.socket || !this.socket.connected || this.offlineQueue.length === 0) {
            return;
        }

        const replayWindowMs = this.options.offlineQueue?.replayWindowMs || DEFAULT_OFFLINE_REPLAY_WINDOW_MS;
        const now = Date.now();
        const replayable = this.offlineQueue.filter((item) => now - item.queued_at <= replayWindowMs);
        this.offlineQueue.length = 0;
        this.persistOfflineQueue();

        for (const item of replayable) {
            if (this.sentEventIds.has(item.event_id)) {
                this.options.offlineQueue?.onReplayConflict?.({
                    event_id: item.event_id,
                    namespace: this.activeNamespace as keyof CoreEventMap,
                    reason: 'duplicate_replay',
                });
                continue;
            }
            this.sentEventIds.add(item.event_id);
            this.socket.emit?.(item.event_name, {
                ...(typeof item.payload === 'object' && item.payload !== null
                    ? item.payload as Record<string, unknown>
                    : { payload: item.payload }),
                client_event_id: item.event_id,
                idempotency_key: item.idempotency_key,
                replayed: true,
            });
        }
    }

    private handleSequenceProgress(namespace: keyof CoreEventMap, payload: unknown): void {
        if (!payload || typeof payload !== 'object') return;

        const maybeSequence = (payload as Record<string, unknown>).sequence;
        if (typeof maybeSequence !== 'number' || !Number.isFinite(maybeSequence)) {
            return;
        }

        const lastSequence = this.lastSequenceByNamespace.get(namespace);
        if (typeof lastSequence === 'number' && maybeSequence > lastSequence + 1) {
            const sequenceGap = {
                namespace,
                expected_sequence: lastSequence + 1,
                received_sequence: maybeSequence,
            };
            this.options.offlineQueue?.onSequenceGap?.(sequenceGap);
            this.emit('reconciliation', {
                type: 'sequence_gap',
                ...sequenceGap,
            });
            this.emit('error', {
                type: 'sequence_gap',
                namespace,
                expected_sequence: lastSequence + 1,
                received_sequence: maybeSequence,
            });
        }

        this.lastSequenceByNamespace.set(namespace, maybeSequence);
    }

    private handleReplayConflict(namespace: keyof CoreEventMap, payload: unknown): boolean {
        if (!payload || typeof payload !== 'object') {
            return false;
        }

        const eventId = (payload as Record<string, unknown>).client_event_id;
        if (typeof eventId !== 'string' || eventId.length === 0) {
            return false;
        }

        if (this.acknowledgedEventIds.has(eventId)) {
            this.options.offlineQueue?.onReplayConflict?.({
                event_id: eventId,
                namespace,
                reason: 'duplicate_ack',
            });
            this.emit('error', {
                type: 'replay_conflict',
                namespace,
                event_id: eventId,
            });
            this.emit('reconciliation', {
                type: 'duplicate_ack',
                namespace,
                event_id: eventId,
            });
            return true;
        }

        this.acknowledgedEventIds.add(eventId);
        this.sentEventIds.delete(eventId);
        return false;
    }

    private restoreOfflineQueue(): void {
        if (!this.options.offlineQueue?.enabled) return;

        try {
            const adapter = this.options.offlineQueue.persistenceAdapter;
            if (adapter) {
                const loaded = adapter.load();
                if (Array.isArray(loaded)) {
                    for (const item of loaded) {
                        if (this.isValidOfflineQueueItem(item)) {
                            this.offlineQueue.push(item);
                        }
                    }
                }
                return;
            }

            const storageKey = this.options.offlineQueue.persistenceKey;
            if (!storageKey || typeof localStorage === 'undefined') return;

            const raw = localStorage.getItem(storageKey);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return;
            for (const item of parsed) {
                if (this.isValidOfflineQueueItem(item)) {
                    this.offlineQueue.push(item);
                }
            }
        } catch {
            // Persistence failures must never break SDK initialization.
        }
    }

    private persistOfflineQueue(): void {
        if (!this.options.offlineQueue?.enabled) return;

        try {
            const adapter = this.options.offlineQueue.persistenceAdapter;
            if (adapter) {
                if (this.offlineQueue.length === 0 && adapter.clear) {
                    adapter.clear();
                    return;
                }
                adapter.save([...this.offlineQueue]);
                return;
            }

            const storageKey = this.options.offlineQueue.persistenceKey;
            if (!storageKey || typeof localStorage === 'undefined') return;

            if (this.offlineQueue.length === 0) {
                localStorage.removeItem(storageKey);
                return;
            }
            localStorage.setItem(storageKey, JSON.stringify(this.offlineQueue));
        } catch {
            // Persistence failures should not interrupt realtime actions.
        }
    }

    private isValidOfflineQueueItem(item: unknown): item is OfflineQueueItem {
        if (!item || typeof item !== 'object') return false;
        const value = item as Record<string, unknown>;
        return (
            typeof value.event_id === 'string' &&
            typeof value.event_name === 'string' &&
            typeof value.queued_at === 'number' &&
            typeof value.idempotency_key === 'string'
        );
    }

    private getRetryConfig(): Required<HttpRetryConfig> {
        const config = this.options.httpRetry || {};
        return {
            maxRetries: config.maxRetries ?? 2,
            baseDelayMs: config.baseDelayMs ?? DEFAULT_RETRY_BASE_DELAY_MS,
            maxDelayMs: config.maxDelayMs ?? DEFAULT_RETRY_MAX_DELAY_MS,
            retryOnStatuses: config.retryOnStatuses ?? DEFAULT_RETRY_STATUSES,
            retryOnNetworkError: config.retryOnNetworkError ?? true,
        };
    }

    private async fetchWithRetry(
        input: string,
        init: RequestInit,
        context: {
            endpoint: string;
            retryNonIdempotent: boolean;
            idempotentKeyPresent: boolean;
        }
    ): Promise<Response> {
        const retryConfig = this.getRetryConfig();
        const method = (init.method || 'GET').toUpperCase();
        const isIdempotentMethod = ['GET', 'HEAD', 'OPTIONS', 'PUT', 'DELETE'].includes(method);
        const canRetry = isIdempotentMethod || context.retryNonIdempotent || context.idempotentKeyPresent;

        let attempt = 0;
        while (true) {
            try {
                const response = await this.fetchImpl(input, init);
                const shouldRetryStatus =
                    canRetry &&
                    attempt < retryConfig.maxRetries &&
                    retryConfig.retryOnStatuses.includes(response.status);

                if (!shouldRetryStatus) {
                    return response;
                }
            } catch (error) {
                const shouldRetryNetwork =
                    canRetry && retryConfig.retryOnNetworkError && attempt < retryConfig.maxRetries;
                if (!shouldRetryNetwork) {
                    throw new SdkRequestError({
                        message: `Network request failed for ${context.endpoint}`,
                        code: 'network_error',
                        endpoint: context.endpoint,
                        retryable: false,
                        details: { cause: String(error) },
                    });
                }
            }

            attempt += 1;
            await this.sleep(this.retryDelayWithJitter(retryConfig.baseDelayMs, retryConfig.maxDelayMs, attempt));
        }
    }

    private retryDelayWithJitter(baseDelayMs: number, maxDelayMs: number, attempt: number): number {
        const backoff = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
        const jitter = Math.floor(Math.random() * Math.max(1, Math.floor(backoff * 0.25)));
        return backoff + jitter;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    private async toSdkError(response: Response, endpoint: string): Promise<SdkRequestError> {
        const body = await this.safeJson(response);
        const errorBody = (body && typeof body === 'object') ? (body as Record<string, unknown>) : {};
        const messageFromBody = typeof errorBody.error === 'string' ? errorBody.error : null;
        const codeFromBody = typeof errorBody.code === 'string' ? errorBody.code : null;
        const retryable = response.status >= 500 || response.status === 429;

        return new SdkRequestError({
            message: messageFromBody || `Request failed (${response.status})`,
            code: codeFromBody || (retryable ? 'upstream_failure' : 'validation_error'),
            endpoint,
            status: response.status,
            retryable,
            details: errorBody,
        });
    }

    private createEventId(): string {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return `evt_${crypto.randomUUID()}`;
        }
        return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    }

    private createCorrelationId(): string {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        return `corr_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    }

    private createIdempotencyKey(): string {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return `idem_${crypto.randomUUID()}`;
        }
        return `idem_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    }

    private async safeJson(response: Response): Promise<unknown> {
        try {
            return await response.json();
        } catch {
            return null;
        }
    }
}
