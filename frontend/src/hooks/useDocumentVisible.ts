'use client';

import { useSyncExternalStore } from 'react';

const subscribe = (cb: () => void) => {
  document.addEventListener('visibilitychange', cb);
  return () => document.removeEventListener('visibilitychange', cb);
};

/** Sekme görünür mü? Polling yapan sorgular arka planda durdurulur. */
export function useDocumentVisible() {
  return useSyncExternalStore(
    subscribe,
    () => document.visibilityState === 'visible',
    () => true
  );
}
