import { BehaviorSubject, Observable } from 'rxjs';

export type AdapterConnectionState = 'unauthenticated' | 'token-refresh' | 'connected' | 'degraded' | 'disconnected';

export interface CoreSdkLike {
  getState(): AdapterConnectionState;
  on(event: 'stateChange' | 'socket:event' | 'error', listener: (payload: any) => void): () => void;
  connectSocket(namespace?: string): void;
  disconnectSocket(): void;
}

export interface AngularAdapterConfig {
  sdk: CoreSdkLike;
  namespace?: string;
  autoConnect?: boolean;
}

export class CaasAngularAdapter {
  private readonly stateSubject: BehaviorSubject<AdapterConnectionState>;
  private readonly errorSubject = new BehaviorSubject<string | null>(null);
  private readonly eventSubject = new BehaviorSubject<any | null>(null);
  private readonly unsubscribers: Array<() => void> = [];
  private connectedByAdapter = false;

  constructor(private readonly config: AngularAdapterConfig) {
    this.stateSubject = new BehaviorSubject<AdapterConnectionState>(config.sdk.getState());

    this.unsubscribers.push(
      config.sdk.on('stateChange', (payload) => {
        if (payload?.next) this.stateSubject.next(payload.next as AdapterConnectionState);
      })
    );

    this.unsubscribers.push(
      config.sdk.on('error', (payload) => {
        this.errorSubject.next(payload?.message ? String(payload.message) : 'unknown_error');
      })
    );

    this.unsubscribers.push(
      config.sdk.on('socket:event', (payload) => {
        this.eventSubject.next(payload);
      })
    );

    // Avoid side effects during SSR prerender.
    if (config.autoConnect && typeof window !== 'undefined') {
      config.sdk.connectSocket(config.namespace || 'chat');
      this.connectedByAdapter = true;
    }
  }

  get state$(): Observable<AdapterConnectionState> {
    return this.stateSubject.asObservable();
  }

  get error$(): Observable<string | null> {
    return this.errorSubject.asObservable();
  }

  get events$(): Observable<any | null> {
    return this.eventSubject.asObservable();
  }

  destroy() {
    for (const off of this.unsubscribers) off();
    if (this.connectedByAdapter) {
      this.config.sdk.disconnectSocket();
    }
  }
}
