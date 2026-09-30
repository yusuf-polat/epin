'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { getErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/utils/format';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Pagination } from '@/components/shared/Pagination';
import { Toast, useToast } from '@/components/shared/Toast';
import { inputClass } from '@/components/ui/FormField';
import { useAdminStores, useToggleStore } from '../hooks/useStores';
import { Store } from '../types';

export default function AdminStoresView() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState<string | undefined>();
  const stores = useAdminStores({ page, search });
  const toggle = useToggleStore();
  const { toast, show } = useToast();

  const onToggle = async (s: Store) => {
    try {
      const updated = await toggle.mutateAsync(s.id);
      show(updated.isActive ? 'Mağaza aktifleştirildi.' : 'Mağaza askıya alındı.');
    } catch (err) {
      show(getErrorMessage(err), 'error');
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-xl text-white">Mağaza Yönetimi</h1>
          <p className="text-xs text-[#64748b] mt-1">Askıya alınan mağazaların ilanları vitrinde görünmez ve satın alınamaz.</p>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(searchInput.trim() || undefined);
          }}
        >
          <input value={searchInput} maxLength={100} onChange={(e) => setSearchInput(e.target.value)} placeholder="Mağaza ara..." className={inputClass} />
          <button type="submit" className="px-3 rounded-xl bg-[#161824] border border-[#222534] text-white text-xs font-bold">
            Ara
          </button>
        </form>
      </div>

      {stores.isPending ? (
        <LoadingState />
      ) : stores.isError ? (
        <ErrorState message={getErrorMessage(stores.error)} onRetry={() => stores.refetch()} />
      ) : (
        <>
          <div className="bg-[#10121a] rounded-2xl border border-[#1c1f2b] divide-y divide-[#1c1f2b]">
            {stores.data.items.length === 0 && <div className="p-10 text-center text-xs text-[#64748b]">Mağaza bulunamadı.</div>}
            {stores.data.items.map((s) => (
              <div key={s.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img src={s.logoUrl} alt="" className="w-12 h-12 rounded-xl object-cover border border-[#23293a]" />
                  <div className="min-w-0">
                    <Link href={`/magaza/${s.slug}`} target="_blank" className="text-sm font-bold text-white hover:text-[#38bdf8]">
                      {s.name}
                    </Link>
                    <div className="text-[11px] text-[#64748b]">
                      {s.owner.name} {s.owner.email ? `· ${s.owner.email}` : ''} · {formatDate(s.createdAt)}
                    </div>
                    <div className="text-[11px] text-[#94a3b8]">
                      {s.stats?.activeListings ?? 0} ilan · {s.stats?.totalSales ?? 0} satış · Puan {s.stats?.avgRating != null ? s.stats.avgRating.toFixed(1) : '—'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={toggle.isPending && toggle.variables === s.id}
                  onClick={() => onToggle(s)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border disabled:opacity-50 ${
                    s.isActive ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  }`}
                >
                  {s.isActive ? 'Askıya Al' : 'Aktifleştir'}
                </button>
              </div>
            ))}
          </div>
          <Pagination page={stores.data.meta.page} totalPages={stores.data.meta.totalPages} onChange={setPage} />
        </>
      )}
      <Toast toast={toast} />
    </div>
  );
}
