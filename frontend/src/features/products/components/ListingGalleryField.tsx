'use client';

import React, { useRef } from 'react';
import { getErrorMessage } from '@/lib/api';
import { useUploadImage } from '@/features/uploads/hooks/useUploadImage';
import { IMAGE_ACCEPT } from '@/features/uploads/constants';
import { MAX_GALLERY_IMAGES } from '../constants';

interface ListingGalleryFieldProps {
  images: string[];
  onChange: (images: string[]) => void;
  onError: (message: string | null) => void;
  upload: ReturnType<typeof useUploadImage>;
  hint?: string;
}

/** İlan galerisi: görsel yükleme, kapak seçme ve silme */
export function ListingGalleryField({ images, onChange, onError, upload, hint }: ListingGalleryFieldProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_GALLERY_IMAGES - images.length);
    if (files.length === 0) return;
    onError(null);
    const failed: string[] = [];
    let current = images;
    for (const file of files) {
      try {
        current = [...current, await upload.mutateAsync(file)];
        onChange(current);
      } catch (err) {
        failed.push(`${file.name}: ${getErrorMessage(err)}`);
      }
    }
    if (failed.length) onError(failed.join(' · '));
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div>
      <span className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider block mb-1.5">
        Görseller ({images.length}/{MAX_GALLERY_IMAGES}) · İlk görsel kapak olur
      </span>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {images.map((img, i) => (
          <div key={img} className="relative aspect-square rounded-xl overflow-hidden border border-[#23293a] group">
            <img src={img} alt="" className="w-full h-full object-cover" />
            {i === 0 && <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-[#2563eb] text-[9px] font-bold text-white">KAPAK</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-between p-1 bg-black/70 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100">
              {i !== 0 && (
                <button type="button" className="text-[10px] text-white" onClick={() => onChange([img, ...images.filter((x) => x !== img)])}>
                  Kapak
                </button>
              )}
              <button type="button" className="text-[10px] text-rose-300 ml-auto" onClick={() => onChange(images.filter((x) => x !== img))}>
                Sil
              </button>
            </div>
          </div>
        ))}
        {images.length < MAX_GALLERY_IMAGES && (
          <button
            type="button"
            disabled={upload.isPending}
            onClick={() => fileRef.current?.click()}
            className="aspect-square rounded-xl border border-dashed border-[#2c3245] text-[#64748b] hover:text-white hover:border-[#38bdf8] flex flex-col items-center justify-center gap-1 text-[11px]"
          >
            <span className="material-symbols-outlined">{upload.isPending ? 'hourglass_top' : 'add_photo_alternate'}</span>
            {upload.isPending ? 'Yükleniyor' : 'Görsel Ekle'}
          </button>
        )}
      </div>
      <input ref={fileRef} type="file" accept={IMAGE_ACCEPT} multiple hidden onChange={onFiles} />
      {hint && <p className="text-[11px] text-[#64748b] mt-2">{hint}</p>}
    </div>
  );
}
