import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { CoreSdkLike, SdkReactConfig, AdapterConnectionState } from './types';

interface ReactSdkContextValue {
  sdk: CoreSdkLike;
  state: AdapterConnectionState;
  lastError: string | null;
  theme: SdkReactConfig['theme'];
}

const ReactSdkContext = createContext<ReactSdkContextValue | null>(null);

export function CaasProvider({ children, config }: { children: React.ReactNode; config: SdkReactConfig }) {
  const [state, setState] = useState<AdapterConnectionState>(config.sdk.getState());
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    if (config.autoConnect && typeof window !== 'undefined') {
      config.sdk.connectSocket(config.namespace || 'chat');
    }

    const offState = config.sdk.on('stateChange', (payload) => {
      if (payload?.next) setState(payload.next as AdapterConnectionState);
    });

    const offError = config.sdk.on('error', (payload) => {
      if (payload?.message) setLastError(String(payload.message));
    });

    return () => {
      offState();
      offError();
      if (config.autoConnect && typeof window !== 'undefined') {
        config.sdk.disconnectSocket();
      }
    };
  }, [config]);

  const value = useMemo(() => ({
    sdk: config.sdk,
    state,
    lastError,
    theme: config.theme,
  }), [config.sdk, config.theme, lastError, state]);

  return <ReactSdkContext.Provider value={value}>{children}</ReactSdkContext.Provider>;
}

export function useCaasSdk() {
  const context = useContext(ReactSdkContext);
  if (!context) {
    throw new Error('useCaasSdk must be used inside CaasProvider');
  }
  return context;
}

export function useConnectionState() {
  return useCaasSdk().state;
}
