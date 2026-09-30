'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getErrorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/utils/format';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Pagination } from '@/components/shared/Pagination';
import { Toast, useToast } from '@/components/shared/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, inputClass } from '@/components/ui/FormField';
import { useAdminDeleteReview, useAdminReviews } from '../hooks/useProducts';
import { AdminReview } from '../types';

const selectClass = 'px-3 py-2 rounded-xl bg-[#090a0f] border border-[#1c1f2b] text-xs text-white focus:outline-none focus:border-[#38bdf8]';

export default function AdminReviewsView() {
  const [params, setParams] = useState<{ page: number; rating?: number; search?: string }>({ page: 1 });
  const [text, setText] = useState('');
  const list = useAdminReviews(params);
  const remove = useAdminDeleteReview();
  const [deleting, setDeleting] = useState<AdminReview | null>(null);
  const [reason, setReason] = useState('');
  const { toast, show } = useToast();

  const submitDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleting) return;
    try {
      await remove.mutateAsync({ id: deleting.id, reason: reason.trim() });
      show('Yorum kaldırıldı, yazarı bilgilendirildi.');
      setDeleting(null);
    } catch (err) {
      show(getErrorMessage(err), 'error');
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] flex flex-col gap-4">
        <div>
          <h1 className="font-display font-extrabold text-xl text-white">Yorum Denetimi</h1>
          <p className="text-xs text-[#64748b] mt-1">Topluluk kurallarına aykırı (hakaret, kişisel bilgi, spam) değerlendirmeleri gerekçesiyle kaldırın.</p>
        </div>
        <form
          className="flex flex-col sm:flex-row gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setParams({ ...params, page: 1, search: text.trim() || undefined });
          }}
        >
          <select
            value={params.rating ?? ''}
            onChange={(e) => setParams({ ...params, page: 1, rating: e.target.value ? Number(e.target.value) : undefined })}
            className={selectClass}
            aria-label="Puan"
          >
            <option value="">Tüm puanlar</option>
            {[1, 2, 3, 4, 5].map((r) => (
              <option key={r} value={r}>
                {r} yıldız
              </option>
            ))}
          </select>
          <input value={text} onChange={(e) => setText(e.target.value)} maxLength={100} placeholder="Yorum metni, ürün veya e-posta" className={`${selectClass} flex-1`} />
          <button type="submit" className="px-4 py-2 rounded-xl bg-[#161824] border border-[#222534] text-white text-xs font-bold">
            Ara
          </button>
        </form>
      </div>

      {list.isPending ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState message={getErrorMessage(list.error)} onRetry={() => list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState icon="reviews" title="Yorum bulunamadı" />
      ) : (
        <div className="bg-[#10121a] rounded-2xl border border-[#1c1f2b] divide-y divide-[#1c1f2b]">
          {list.data.items.map((r) => (
            <div key={r.id} className="p-4 flex flex-col lg:flex-row lg:items-start justify-between gap-3">
              <div className="min-w-0 flex flex-col gap-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[#f59e0b] text-xs font-bold">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                  <Link href={`/urun/${r.product.slug}`} target="_blank" className="text-xs font-bold text-white hover:underline truncate">
                    {r.product.title}
                  </Link>
                </div>
                <p className="text-xs text-[#cbd5e1] whitespace-pre-line">{r.comment}</p>
                {r.sellerReply && <p className="text-[11px] text-[#94a3b8] border-l-2 border-[#2563eb] pl-2">Satıcı: {r.sellerReply}</p>}
                <div className="text-[11px] text-[#64748b]">
                  {formatDateTime(r.createdAt)} · {r.user.name} ({r.user.email}){r.product.seller ? ` · Satıcı: ${r.product.seller.name}` : ''}
                </div>
              </div>
              <Button
                variant="danger"
                className="shrink-0"
                onClick={() => {
                  setReason('');
                  setDeleting(r);
                }}
              >
                Kaldır
              </Button>
            </div>
          ))}
        </div>
      )}
      {list.data && <Pagination page={list.data.meta.page} totalPages={list.data.meta.totalPages} onChange={(page) => setParams({ ...params, page })} />}

      <Modal open={!!deleting} onClose={() => !remove.isPending && setDeleting(null)} title="Yorumu Kaldır">
        <form onSubmit={submitDelete} className="flex flex-col gap-4">
          <p className="text-xs text-[#94a3b8] line-clamp-3">&ldquo;{deleting?.comment}&rdquo;</p>
          <FormField label="Gerekçe (yorum sahibine iletilir)">
            <textarea rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} />
          </FormField>
          <Button type="submit" variant="danger" loading={remove.isPending} disabled={reason.trim().length < 3}>
            Yorumu Kaldır
          </Button>
        </form>
      </Modal>
      <Toast toast={toast} />
    </div>
  );
}
