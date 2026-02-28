export type SdkConnectionState =
    | 'unauthenticated'
    | 'token-refresh'
    | 'connected'
    | 'degraded'
    | 'disconnected';

export type SessionCreatePayload = {
    user_external_id: string;
    project_id?: string;
    user_data?: {
        name?: string;
        email?: string;
        avatar?: string;
        metadata?: Record<string, unknown>;
    };
    device_info?: {
        device_id?: string;
        device_type?: 'web' | 'mobile' | 'desktop';
        user_agent?: string;
    };
};

export type SessionTokenBundle = {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
};

export type SessionCreateResult = SessionTokenBundle & {
    user: {
        user_id: string;
        external_id: string;
        tenant_id: string;
        project_id?: string;
    };
    socket_urls?: string[];
};

export type SessionRefreshResult = SessionTokenBundle;

export type SessionAuthContext = {
    apiKey: string;
    projectId?: string;
    correlationId?: string;
    idempotencyKey?: string;
    userAgent?: string;
    signedHeaders?: {
        timestamp: string;
        nonce: string;
        signature?: string;
    };
};

export type SignedHeadersProvider = () => {
    timestamp: string;
    nonce: string;
    signature?: string;
};

export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type SocketLike = {
    connect: () => void;
    disconnect: () => void;
    emit?: (event: string, payload?: unknown) => void;
    on: (event: string, listener: (...args: any[]) => void) => void;
    off: (event: string, listener?: (...args: any[]) => void) => void;
    connected?: boolean;
};

export type SocketFactory = (
    url: string,
    options: {
        auth: { token: string };
        transports: string[];
        autoConnect: boolean;
    }
) => SocketLike;

export type OutboundSocketEvent =
    | 'joinRoom'
    | 'leaveRoom'
    | 'sendMessage'
    | 'typing_start'
    | 'typing_stop'
    | 'message_read'
    | 'messages_read'
    | 'message_delivered'
    | 'messages_delivered';

export interface OfflineQueueItem {
    event_id: string;
    event_name: string;
    payload: unknown;
    queued_at: number;
    idempotency_key: string;
}

export interface ReplayConflictEvent {
    event_id: string;
    namespace: keyof CoreEventMap;
    reason: 'duplicate_ack' | 'duplicate_replay';
}

export interface OfflineQueuePersistenceAdapter {
    load: () => OfflineQueueItem[];
    save: (items: OfflineQueueItem[]) => void;
    clear?: () => void;
}

export interface SequenceGapEvent {
    namespace: keyof CoreEventMap;
    expected_sequence: number;
    received_sequence: number;
}

export interface OfflineQueueConfig {
    enabled?: boolean;
    maxItems?: number;
    replayWindowMs?: number;
    discardPolicy?: 'drop_oldest' | 'drop_newest';
    persistenceKey?: string;
    persistenceAdapter?: OfflineQueuePersistenceAdapter;
    onSequenceGap?: (event: SequenceGapEvent) => void;
    onQueueOverflow?: (dropped: OfflineQueueItem) => void;
    onDiscard?: (dropped: OfflineQueueItem) => void;
    onReplayConflict?: (event: ReplayConflictEvent) => void;
}

export interface HttpRetryConfig {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    retryOnStatuses?: number[];
    retryOnNetworkError?: boolean;
}

export type SdkCoreOptions = {
    gatewayBaseUrl: string;
    socketBaseUrl: string;
    fetchImpl?: FetchLike;
    socketFactory?: SocketFactory;
    reconnectDelayMs?: number;
    outboundEventAllowlist?: OutboundSocketEvent[];
    offlineQueue?: OfflineQueueConfig;
    httpRetry?: HttpRetryConfig;
    signedHeadersProvider?: SignedHeadersProvider;
    allowBrowserApiKey?: boolean;
};

export type SdkCapabilities = {
    session: {
        create: boolean;
        refresh: boolean;
        logout: boolean;
    };
    headers?: {
        required?: string[];
        optional?: string[];
    };
    errors?: Record<string, string>;
};

export type SdkHealth = {
    status: 'ok' | 'degraded' | 'error';
    service: string;
    dependencies?: Record<string, string>;
};

export const DEFAULT_SOCKET_EVENT_MAP = {
    chat: ['message', 'user_typing', 'message_delivered', 'message_read'],
    presence: ['presence:update', 'presence:online', 'presence:offline'],
    webrtc: ['call:offer', 'call:answer', 'call:ice-candidate'],
} as const;

export type CoreEventMap = typeof DEFAULT_SOCKET_EVENT_MAP;

export const DEFAULT_OUTBOUND_EVENT_ALLOWLIST: OutboundSocketEvent[] = [
    'joinRoom',
    'leaveRoom',
    'sendMessage',
    'typing_start',
    'typing_stop',
    'message_read',
    'messages_read',
    'message_delivered',
    'messages_delivered',
];
