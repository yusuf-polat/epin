import React from 'react';
import { cn } from '@/lib/utils/cn';

export function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wide', className)}>{children}</span>;
}
