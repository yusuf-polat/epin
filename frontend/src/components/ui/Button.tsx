import React from 'react';
import { cn } from '@/lib/utils/cn';

const variants = {
  primary: 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-md',
  secondary: 'bg-[#161824] hover:bg-[#1d2030] border border-[#222636] text-white',
  danger: 'bg-rose-600 hover:bg-rose-700 text-white',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  ghost: 'text-[#94a3b8] hover:text-white hover:bg-[#161824]',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  loading?: boolean;
}

export function Button({ variant = 'primary', loading, className, children, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        className
      )}
      {...rest}
    >
      {loading ? 'İşleniyor...' : children}
    </button>
  );
}
