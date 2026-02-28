import type { SdkConnectionState } from './types';

type EventType =
    | 'BOOTSTRAP'
    | 'REFRESH'
    | 'CONNECT'
    | 'DEGRADE'
    | 'DISCONNECT'
    | 'AUTH_REQUIRED';

const transitions: Record<SdkConnectionState, Partial<Record<EventType, SdkConnectionState>>> = {
    unauthenticated: {
        BOOTSTRAP: 'token-refresh',
        CONNECT: 'connected',
        AUTH_REQUIRED: 'unauthenticated',
    },
    'token-refresh': {
        CONNECT: 'connected',
        DEGRADE: 'degraded',
        DISCONNECT: 'disconnected',
        AUTH_REQUIRED: 'unauthenticated',
    },
    connected: {
        REFRESH: 'token-refresh',
        DEGRADE: 'degraded',
        DISCONNECT: 'disconnected',
        AUTH_REQUIRED: 'unauthenticated',
    },
    degraded: {
        REFRESH: 'token-refresh',
        CONNECT: 'connected',
        DISCONNECT: 'disconnected',
        AUTH_REQUIRED: 'unauthenticated',
    },
    disconnected: {
        REFRESH: 'token-refresh',
        CONNECT: 'connected',
        AUTH_REQUIRED: 'unauthenticated',
    },
};

export class ConnectionStateMachine {
    private currentState: SdkConnectionState = 'unauthenticated';

    getState(): SdkConnectionState {
        return this.currentState;
    }

    transition(event: EventType): SdkConnectionState {
        const next = transitions[this.currentState][event];
        if (!next) {
            return this.currentState;
        }
        this.currentState = next;
        return this.currentState;
    }
}
