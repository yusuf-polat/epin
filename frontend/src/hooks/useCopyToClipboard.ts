'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Metni panoya kopyalar; son kopyalanan anahtarı kısa süre "kopyalandı" olarak tutar */
export function useCopyToClipboard(resetMs = 2000) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const copy = useCallback(
    async (text: string, key = text) => {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopiedKey(null), resetMs);
    },
    [resetMs]
  );

  useEffect(() => () => clearTimeout(timer.current), []);
  return { copy, copiedKey };
}
