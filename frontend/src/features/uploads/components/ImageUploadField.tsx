'use client';

import React from 'react';
import { getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils/cn';
import { useUploadImage } from '../hooks/useUploadImage';
import { IMAGE_ACCEPT } from '../constants';

interface ImageUploadFieldProps {
  value?: string;
  onChange: (url: string) => void;
  label: string;
  error?: string;
  className?: string;
  shape?: 'square' | 'wide';
}

/** Tıklanabilir görsel alanı: dosyayı yükler ve URL'yi forma yazar */
export function ImageUploadField({ value, onChange, label, error, className, shape = 'wide' }: ImageUploadFieldProps) {
  const upload = useUploadImage();

  const onFile = async (file?: File) => {
    if (!file) return;
    try {
      onChange(await upload.mutateAsync(file));
    } catch {
      // Hata aşağıda gösterilir
    }
  };

  const message = error ?? (upload.error ? getErrorMessage(upload.error) : undefined);
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">{label}</span>
      <label
        className={cn(
          'relative flex items-center justify-center overflow-hidden rounded-xl border border-dashed border-[#2c3245] hover:border-[#38bdf8] cursor-pointer bg-[#090a0f]',
          shape === 'square' ? 'w-28 h-28' : 'w-full aspect-[3/1]'
        )}
      >
        {value ? (
          <img src={value} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <span className="text-[11px] text-[#64748b] flex flex-col items-center gap-1">
            <span className="material-symbols-outlined">add_photo_alternate</span>
            {upload.isPending ? 'Yükleniyor...' : 'Görsel Seç'}
          </span>
        )}
        <input type="file" accept={IMAGE_ACCEPT} hidden onChange={(e) => onFile(e.target.files?.[0])} />
      </label>
      {message && <span className="text-[11px] font-semibold text-rose-400">{message}</span>}
    </div>
  );
}
