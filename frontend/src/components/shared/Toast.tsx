'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type ToastType = 'success' | 'error';

/** Sayfa içi basit bildirim (toast) durumu */
export function useToast(duration = 4000) {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const show = useCallback(
    (message: string, type: ToastType = 'success') => {
      setToast({ message, type });
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setToast(null), duration);
    },
    [duration]
  );

  useEffect(() => () => clearTimeout(timer.current), []);
  return { toast, show };
}

export function Toast({ toast }: { toast: { message: string; type: ToastType } | null }) {
  if (!toast) return null;
  return (
    <div
      role="status"
      className={`fixed bottom-20 xl:bottom-6 right-4 z-[100] max-w-sm px-4 py-3 rounded-xl text-xs font-bold shadow-2xl border ${
        toast.type === 'success'
          ? 'bg-emerald-950/95 border-emerald-700 text-emerald-200'
          : 'bg-rose-950/95 border-rose-700 text-rose-200'
      }`}
    >
      {toast.message}
    </div>
  );
}
