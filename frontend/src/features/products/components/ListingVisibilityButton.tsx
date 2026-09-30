'use client';

import { getErrorMessage } from '@/lib/api';
import { useSetListed } from '../hooks/useProducts';

interface ListingVisibilityButtonProps {
  id: string;
  isListed: boolean;
  onResult: (message: string, type?: 'success' | 'error') => void;
}

/** Tek tuşla ilanı yayından kaldırır / yeniden yayına alır. Stok ve kodlar korunur. */
export function ListingVisibilityButton({ id, isListed, onResult }: ListingVisibilityButtonProps) {
  const setListed = useSetListed();

  const toggle = async () => {
    try {
      const res = await setListed.mutateAsync({ id, isListed: !isListed });
      onResult(res.isListed ? 'İlan yeniden yayına alındı.' : 'İlan yayından kaldırıldı. Stok ve kodlarınız korunuyor.');
    } catch (err) {
      onResult(getErrorMessage(err), 'error');
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={setListed.isPending}
      title={isListed ? 'İlanı vitrinden gizle; istediğiniz zaman tekrar yayına alabilirsiniz' : 'İlanı tekrar vitrine çıkar'}
      className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 disabled:opacity-50 ${
        isListed
          ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
      }`}
    >
      <span className="material-symbols-outlined text-sm">{setListed.isPending ? 'hourglass_top' : isListed ? 'visibility_off' : 'visibility'}</span>
      {isListed ? 'Yayından Kaldır' : 'Yayına Al'}
    </button>
  );
}
