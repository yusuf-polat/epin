'use client';

import React, { useState } from 'react';
import { formatDateTime, formatTRY } from '@/lib/utils/format';
import { Dispute } from '../types';
import { DISPUTE_REASON_LABELS, DISPUTE_STATUS_LABELS, extractYoutubeId } from '../constants';

/** İtiraz özeti; kanıt videosu tıklanınca açılır (sayfa yüklenirken tüm iframe'ler yüklenmez) */
export function DisputeCard({ dispute, actions }: { dispute: Dispute; actions?: React.ReactNode }) {
  const [showVideo, setShowVideo] = useState(false);
  const videoId = extractYoutubeId(dispute.videoUrl);
  const status = DISPUTE_STATUS_LABELS[dispute.status];

  return (
    <div className="p-5 rounded-2xl bg-[#10121a] border border-[#1c1f2b] flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#1c1f2b]">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono font-bold text-sm text-white">#{dispute.order.orderNumber}</span>
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${status.className}`}>{status.label}</span>
          <span className="text-[11px] text-rose-300 font-semibold">{DISPUTE_REASON_LABELS[dispute.reason]}</span>
        </div>
        <span className="font-display font-black text-sm text-white">{formatTRY(dispute.order.escrowAmount)}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-[#94a3b8]">
        <span>
          Alıcı: <strong className="text-white">{dispute.buyer.name}</strong>
        </span>
        <span>
          Satıcı: <strong className="text-white">{dispute.seller?.name ?? 'NexusPin (platform)'}</strong>
        </span>
        <span>Açılış: {formatDateTime(dispute.createdAt)}</span>
      </div>

      <div className="text-xs text-[#94a3b8]">
        {dispute.order.items.map((i, idx) => (
          <div key={idx}>
            {i.variant.product.title} · {i.variant.title} × {i.quantity}
          </div>
        ))}
      </div>

      <div className="p-3 rounded-xl bg-[#090a0f] border border-[#1c1f2b]">
        <p className="text-[11px] text-[#64748b] font-semibold mb-1">Alıcı açıklaması</p>
        <p className="text-xs text-[#cbd5e1] whitespace-pre-line">{dispute.description}</p>
      </div>

      {dispute.sellerResponse && (
        <div className="p-3 rounded-xl bg-[#090a0f] border border-[#1c1f2b]">
          <p className="text-[11px] text-[#64748b] font-semibold mb-1">Satıcı yanıtı ({dispute.sellerAction})</p>
          <p className="text-xs text-[#cbd5e1] whitespace-pre-line">{dispute.sellerResponse}</p>
          {dispute.replacementCode && <p className="text-xs font-mono text-purple-300 mt-1">Değişim kodu: {dispute.replacementCode}</p>}
        </div>
      )}

      {dispute.adminNotes && (
        <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
          <p className="text-[11px] text-purple-300 font-semibold mb-1">Hakem notu</p>
          <p className="text-xs text-[#cbd5e1] whitespace-pre-line">{dispute.adminNotes}</p>
        </div>
      )}

      {videoId ? (
        showVideo ? (
          <div className="rounded-xl overflow-hidden border border-[#1c1f2b] aspect-video">
            <iframe className="w-full h-full" src={`https://www.youtube-nocookie.com/embed/${videoId}`} allowFullScreen title="İtiraz videosu" />
          </div>
        ) : (
          <button type="button" onClick={() => setShowVideo(true)} className="self-start inline-flex items-center gap-1.5 text-xs font-bold text-[#38bdf8] hover:underline">
            <span className="material-symbols-outlined text-sm">play_circle</span>
            Kanıt Videosunu İzle
          </button>
        )
      ) : (
        <a href={dispute.videoUrl} target="_blank" rel="noopener noreferrer nofollow" className="text-xs text-[#38bdf8] hover:underline">
          Kanıt videosu bağlantısı
        </a>
      )}

      {actions && <div className="flex flex-wrap gap-2 pt-2 border-t border-[#1c1f2b]">{actions}</div>}
    </div>
  );
}
