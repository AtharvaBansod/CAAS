import { useEffect, useState } from 'react';
import { useCaasSdk } from './provider';

export function useChatEvents() {
  const { sdk } = useCaasSdk();
  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {
    const off = sdk.on('socket:event', (payload) => {
      setEvents((prev) => [...prev.slice(-49), payload]);
    });
    return off;
  }, [sdk]);

  return events;
}
