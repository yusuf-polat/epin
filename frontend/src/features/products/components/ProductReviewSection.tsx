'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { getErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/utils/format';
import { useAuth } from '@/features/auth/hooks/useAuth';
import ReportButton from '@/features/complaints/components/ReportButton';
import { useAddReview, useProductReviews, useReplyReview } from '../hooks/useProducts';
import { reviewSchema, ReviewValues } from '../schemas/product.schema';
import { Review } from '../types';

/** İlan sahibinin yoruma herkese açık yanıtı: görüntüleme ve (sahipse) düzenleme */
function SellerReply({ slug, review, isSeller }: { slug: string; review: Review; isSeller: boolean }) {
  const reply = useReplyReview(slug);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(review.sellerReply ?? '');

  const save = async (value: string | null) => {
    try {
      await reply.mutateAsync({ reviewId: review.id, reply: value });
      setEditing(false);
    } catch {
      // Hata aşağıda gösterilir
    }
  };

  if (editing) {
    return (
      <div className="ml-9 flex flex-col gap-2">
        <textarea
          rows={2}
          maxLength={1000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Alıcıya herkese açık yanıtınız"
          className="w-full px-3 py-2 text-xs rounded-xl bg-[#141620] border border-[#222534] text-white placeholder-[#64748b] focus:outline-none focus:border-[#2563eb] resize-none"
        />
        {reply.error && <span className="text-[11px] text-rose-400">{getErrorMessage(reply.error)}</span>}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={() => setEditing(false)} className="text-[11px] font-bold text-[#94a3b8] hover:text-white">
            Vazgeç
          </button>
          <button
            type="button"
            disabled={reply.isPending || text.trim().length < 2}
            onClick={() => save(text.trim())}
            className="px-3 py-1.5 rounded-lg bg-[#2563eb] text-white text-[11px] font-bold disabled:opacity-50"
          >
            {reply.isPending ? 'Kaydediliyor...' : 'Yanıtı Yayınla'}
          </button>
        </div>
      </div>
    );
  }

  if (!review.sellerReply) {
    return isSeller ? (
      <button type="button" onClick={() => setEditing(true)} className="ml-9 self-start text-[11px] font-bold text-[#38bdf8] hover:underline">
        Yanıtla
      </button>
    ) : null;
  }

  return (
    <div className="ml-9 p-3 rounded-lg bg-[#141620] border-l-2 border-[#2563eb] flex flex-col gap-1">
      <div className="flex items-center gap-2 text-[11px] font-bold text-[#38bdf8]">
        <span className="material-symbols-outlined text-sm">storefront</span>
        Satıcının yanıtı
        {review.sellerRepliedAt && <span className="text-[10px] font-normal text-[#64748b]">{formatDate(review.sellerRepliedAt)}</span>}
        {isSeller && (
          <span className="ml-auto flex gap-2">
            <button type="button" onClick={() => setEditing(true)} className="text-[#94a3b8] hover:text-white">
              Düzenle
            </button>
            <button type="button" disabled={reply.isPending} onClick={() => save(null)} className="text-rose-300 hover:underline">
              Kaldır
            </button>
          </span>
        )}
      </div>
      <p className="text-xs text-[#cbd5e1] whitespace-pre-line">{review.sellerReply}</p>
    </div>
  );
}

export default function ProductReviewSection({ slug, sellerId }: { slug: string; sellerId?: string | null }) {
  const { user } = useAuth();
  const reviewsQuery = useProductReviews(slug);
  const reviews = reviewsQuery.data ?? [];
  const addReview = useAddReview(slug);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { register, handleSubmit, setValue, watch, reset, formState } = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 5, comment: '' },
  });
  const rating = watch('rating');
  const isSeller = !!user && !!sellerId && user.id === sellerId;

  const onSubmit = handleSubmit(async (values) => {
    setFeedback(null);
    try {
      await addReview.mutateAsync(values);
      setFeedback({ type: 'success', text: 'Değerlendirmeniz yayınlandı. Teşekkür ederiz!' });
      reset();
    } catch (err) {
      setFeedback({ type: 'error', text: getErrorMessage(err, 'Yorum kaydedilemedi. Lütfen tekrar deneyin.') });
    }
  });

  const averageRating = reviews.length ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length : null;
  const starCounts = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((r) => r.rating === stars).length;
    return { stars, count, percentage: reviews.length ? Math.round((count / reviews.length) * 100) : 0 };
  });

  return (
    <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] shadow-xl flex flex-col gap-6">
      <div className="flex items-center justify-between pb-4 border-b border-[#1c1f2b]">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#38bdf8]">rate_review</span>
          <h3 className="font-display font-bold text-lg text-white">Müşteri Değerlendirmeleri</h3>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#161824] border border-[#222534] text-[#38bdf8]">
          {reviews.length} Değerlendirme
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center p-4 rounded-xl bg-[#0d0e14] border border-[#1c1f2b]">
        <div className="md:col-span-4 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-[#1c1f2b] pb-4 md:pb-0 md:pr-4">
          <div className="font-display font-extrabold text-4xl text-white">{averageRating !== null ? averageRating.toFixed(1) : '—'}</div>
          <div className="flex items-center gap-1 text-[#f59e0b] my-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <span key={star} className="material-symbols-outlined text-lg">
                {averageRating !== null && star <= Math.round(averageRating) ? 'star' : 'star_border'}
              </span>
            ))}
          </div>
          <div className="text-xs text-[#64748b]">{averageRating !== null ? 'Ortalama Puan' : 'Henüz puan yok'}</div>
        </div>

        <div className="md:col-span-8 flex flex-col gap-1.5">
          {starCounts.map((item) => (
            <div key={item.stars} className="flex items-center gap-2 text-xs">
              <span className="w-12 font-medium text-[#94a3b8] flex items-center gap-1">
                {item.stars} <span className="material-symbols-outlined text-xs text-[#f59e0b]">star</span>
              </span>
              <div className="flex-1 h-2 bg-[#1c1f2b] rounded-full overflow-hidden">
                <div className="h-full bg-[#2563eb] rounded-full transition-all duration-500" style={{ width: `${item.percentage}%` }} />
              </div>
              <span className="w-8 text-right text-[#64748b]">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      {user ? (
        <form onSubmit={onSubmit} className="p-4 rounded-xl bg-[#0d0e14] border border-[#1c1f2b] flex flex-col gap-4">
          <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[#38bdf8] text-base">edit_note</span>
            Deneyiminizi Paylaşın
          </h4>
          <p className="text-[11px] text-[#64748b] -mt-2">Yalnızca bu ürünü satın alıp teslim almış kullanıcılar değerlendirme yapabilir.</p>

          {feedback && (
            <div
              className={`p-3 rounded-lg text-xs font-semibold ${
                feedback.type === 'success' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800' : 'bg-rose-950/60 text-rose-300 border border-rose-800'
              }`}
            >
              {feedback.text}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">Puanınız:</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  aria-label={`${star} yıldız`}
                  onClick={() => setValue('rating', star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="text-2xl transition-transform hover:scale-110 focus:outline-none"
                >
                  <span className={`material-symbols-outlined ${star <= (hoverRating || rating) ? 'text-[#f59e0b]' : 'text-[#333748]'}`}>star</span>
                </button>
              ))}
              <span className="ml-2 text-xs font-bold text-white">{hoverRating || rating} / 5</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#94a3b8] mb-1">Yorumunuz:</label>
            <textarea
              {...register('comment')}
              maxLength={1000}
              placeholder="Kod teslim hızı, ürün kalitesi veya deneyiminiz hakkında bir şeyler yazın..."
              rows={3}
              className="w-full px-3 py-2 text-xs rounded-xl bg-[#141620] border border-[#222534] text-white placeholder-[#64748b] focus:outline-none focus:border-[#2563eb] transition-all resize-none"
            />
            {formState.errors.comment && <span className="text-[11px] font-semibold text-rose-400">{formState.errors.comment.message}</span>}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={addReview.isPending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold transition-all shadow-md disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">send</span>
              {addReview.isPending ? 'Gönderiliyor...' : 'Değerlendirmeyi Yayınla'}
            </button>
          </div>
        </form>
      ) : (
        <div className="p-4 rounded-xl bg-[#0d0e14] border border-[#1c1f2b] flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div>
            <div className="text-xs font-bold text-white">Bu ürünü daha önce satın aldınız mı?</div>
            <div className="text-[11px] text-[#64748b]">Deneyiminizi paylaşmak ve puan vermek için giriş yapın.</div>
          </div>
          <Link
            href={`/auth/login?redirect=/urun/${slug}`}
            className="px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold transition-all shrink-0 shadow-md"
          >
            Giriş Yap ve Yorumla
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {reviewsQuery.isPending ? (
          <div className="py-8 text-center text-xs text-[#64748b]">Değerlendirmeler yükleniyor...</div>
        ) : reviews.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#64748b] bg-[#0d0e14] rounded-xl border border-dashed border-[#1c1f2b]">
            Henüz değerlendirme yapılmamış.
          </div>
        ) : (
          reviews.map((rev) => (
            <div key={rev.id} className="p-4 rounded-xl bg-[#0d0e14] border border-[#1c1f2b] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#2563eb] text-white font-bold text-xs flex items-center justify-center">
                    {rev.user?.name ? rev.user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{rev.user?.name || 'Alıcı'}</span>
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-emerald-950/60 border border-emerald-800 text-emerald-300 font-semibold">
                      <span className="material-symbols-outlined text-[11px]">verified</span>
                      Doğrulanmış Alıcı
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[#f59e0b]">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className="material-symbols-outlined text-sm">
                      {star <= rev.rating ? 'star' : 'star_border'}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-xs text-[#94a3b8] leading-relaxed pl-9 whitespace-pre-line">{rev.comment}</p>
              <div className="text-[10px] text-[#64748b] pl-9 flex items-center gap-3">
                {formatDate(rev.createdAt)}
                <ReportButton targetType="REVIEW" targetId={rev.id} ownerId={rev.user?.id} variant="link" />
              </div>
              <SellerReply slug={slug} review={rev} isSeller={isSeller} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
