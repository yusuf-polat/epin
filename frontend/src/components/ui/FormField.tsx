import React from 'react';
import { cn } from '@/lib/utils/cn';

export const inputClass =
  'w-full px-4 py-2.5 rounded-xl bg-[#090a0f] border border-[#1c1f2b] text-xs text-white placeholder-[#475569] focus:outline-none focus:border-[#38bdf8] disabled:opacity-60';

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

/** Etiket + alan + hata mesajı; React Hook Form alanlarıyla birlikte kullanılır */
export function FormField({ label, error, hint, children, className }: FormFieldProps) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">{label}</span>
      {children}
      {error ? <span className="text-[11px] font-semibold text-rose-400">{error}</span> : hint ? <span className="text-[11px] text-[#64748b]">{hint}</span> : null}
    </label>
  );
}

export function FormAlert({ message, type = 'error' }: { message?: string | null; type?: 'error' | 'success' }) {
  if (!message) return null;
  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={cn(
        'p-3 rounded-xl text-xs font-semibold border',
        type === 'error' ? 'bg-rose-500/10 border-rose-500/25 text-rose-300' : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
      )}
    >
      {message}
    </div>
  );
}
