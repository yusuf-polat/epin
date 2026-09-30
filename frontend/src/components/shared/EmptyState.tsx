import Link from 'next/link';
import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  children?: React.ReactNode;
}

export function EmptyState({ icon = 'inbox', title, description, action, children }: EmptyStateProps) {
  return (
    <div className="bg-[#10121a] border border-[#1c1f2b] rounded-2xl p-10 text-center flex flex-col items-center gap-3">
      <span className="material-symbols-outlined text-4xl text-[#334155]">{icon}</span>
      <h3 className="font-display font-bold text-sm text-white">{title}</h3>
      {description && <p className="text-xs text-[#64748b] max-w-md">{description}</p>}
      {action && (
        <Link href={action.href} className="mt-2 px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold transition-all">
          {action.label}
        </Link>
      )}
      {children}
    </div>
  );
}
