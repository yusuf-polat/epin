'use client';

import { useEffect, useState } from 'react';
import { getErrorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/utils/format';
import { Pagination } from '@/components/shared/Pagination';
import { Toast, useToast } from '@/components/shared/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField, inputClass } from '@/components/ui/FormField';
import { BroadcastAudience, BroadcastInput } from '../services/broadcast.api';
import { useBroadcastHistory, useRecipientCount, useSendBroadcast } from '../hooks/useBroadcasts';

const AUDIENCES: { value: BroadcastAudience; label: string; desc: string }[] = [
  { value: 'ALL', label: 'Tüm kullanıcılar', desc: 'Yasaklı hesaplar hariç herkes' },
  { value: 'SELLERS', label: 'Satıcılar', desc: 'Satıcı yetkisi olan kullanıcılar' },
  { value: 'BUYERS', label: 'Alıcılar', desc: 'Satıcı olmayan kullanıcılar' },
  { value: 'STAFF', label: 'Yönetim ekibi', desc: 'Yönetici ve destek hesapları' },
  { value: 'USER', label: 'Tek kullanıcı', desc: 'E-posta adresiyle seçilen kişi' },
];

const AUDIENCE_LABEL: Record<string, string> = Object.fromEntries(AUDIENCES.map((a) => [a.value, a.label]));

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

export default function BroadcastView() {
  const { toast, show } = useToast();
  const [form, setForm] = useState<BroadcastInput>({ audience: 'ALL', email: '', title: '', message: '', link: '', sendEmail: false });
  const [confirming, setConfirming] = useState(false);
  const [page, setPage] = useState(1);
  const set = <K extends keyof BroadcastInput>(key: K, value: BroadcastInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  // Tek kullanıcıda e-posta yazılırken her tuşta istek atılmaz
  const [debouncedEmail, setDebouncedEmail] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedEmail(form.email?.trim() ?? ''), 400);
    return () => clearTimeout(t);
  }, [form.email]);

  const countEnabled = form.audience !== 'USER' || EMAIL_PATTERN.test(debouncedEmail);
  const count = useRecipientCount(form.audience, form.audience === 'USER' ? debouncedEmail : '', countEnabled);
  const history = useBroadcastHistory(page);
  const send = useSendBroadcast();

  const recipients = count.data?.count ?? 0;
  const linkValid = !form.link || /^\/(?!\/)\S*$/.test(form.link);
  const valid = form.title.trim().length >= 3 && form.message.trim().length >= 5 && linkValid && countEnabled && recipients > 0;

  const submit = async () => {
    try {
      const res = await send.mutateAsync({ ...form, email: form.audience === 'USER' ? form.email?.trim() : undefined, link: form.link?.trim() || undefined });
      show(res.message ?? 'Bildirim gönderildi.');
      setConfirming(false);
      setForm({ ...form, title: '', message: '', link: '' });
    } catch (err) {
      show(getErrorMessage(err), 'error');
      setConfirming(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b]">
        <h1 className="font-display font-bold text-xl text-white">Bildirim Gönder</h1>
        <p className="text-xs text-[#94a3b8] mt-1">Duyuru, bakım veya kampanya bildirimleri. Bildirim zilinde görünür; isterseniz e-posta olarak da gönderilir.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) setConfirming(true);
          }}
          className="xl:col-span-3 bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] flex flex-col gap-5"
        >
          <fieldset className="flex flex-col gap-2">
            <legend className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Kime</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AUDIENCES.map((a) => (
                <label
                  key={a.value}
                  className={`p-3 rounded-xl border cursor-pointer flex gap-2.5 ${form.audience === a.value ? 'border-[#2563eb] bg-[#2563eb]/10' : 'border-[#1c1f2b] hover:border-[#2c3245]'}`}
                >
                  <input type="radio" name="audience" className="accent-[#2563eb] mt-0.5" checked={form.audience === a.value} onChange={() => set('audience', a.value)} />
                  <span>
                    <span className="block text-sm font-semibold text-white">{a.label}</span>
                    <span className="block text-[11px] text-[#64748b]">{a.desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {form.audience === 'USER' && (
            <FormField label="Kullanıcının e-posta adresi">
              <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputClass} placeholder="kullanici@ornek.com" />
            </FormField>
          )}

          <FormField label="Başlık" hint={`${form.title.length}/120`}>
            <input value={form.title} onChange={(e) => set('title', e.target.value)} maxLength={120} className={inputClass} placeholder="Örn: Planlı bakım duyurusu" />
          </FormField>
          <FormField label="Mesaj" hint={`${form.message.length}/2000`}>
            <textarea rows={5} value={form.message} onChange={(e) => set('message', e.target.value)} maxLength={2000} className={inputClass} />
          </FormField>
          <FormField label="Bağlantı (isteğe bağlı)" error={linkValid ? undefined : 'Site içi bir adres giriniz (ör. /katalog)'} hint="Bildirime tıklanınca açılacak sayfa, ör. /katalog?search=steam">
            <input value={form.link} onChange={(e) => set('link', e.target.value)} maxLength={300} className={`${inputClass} font-mono`} placeholder="/sss" />
          </FormField>
          <label className="flex items-start gap-2 text-sm text-white cursor-pointer">
            <input type="checkbox" className="accent-[#2563eb] mt-1" checked={form.sendEmail} onChange={(e) => set('sendEmail', e.target.checked)} />
            <span>
              E-posta olarak da gönder
              <span className="block text-[11px] text-[#64748b]">E-postalar arka planda gönderilir; SMTP ayarının Sistem Ayarları'nda yapılmış olması gerekir.</span>
            </span>
          </label>

          <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#1c1f2b]">
            <span className="text-xs text-[#94a3b8]">
              {!countEnabled ? 'E-posta adresini giriniz' : count.isFetching ? 'Alıcılar hesaplanıyor...' : recipients === 0 ? 'Bu kitlede alıcı yok' : `${recipients.toLocaleString('tr-TR')} alıcı`}
            </span>
            <Button type="submit" disabled={!valid}>
              Gönder
            </Button>
          </div>
        </form>

        <aside className="xl:col-span-2 flex flex-col gap-3">
          <h2 className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">Önizleme</h2>
          <div className="p-4 rounded-2xl bg-[#0e1017] border border-[#1c1f2b] flex gap-3">
            <span className="material-symbols-outlined text-[#7dd3fc]">campaign</span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white break-words">{form.title || 'Bildirim başlığı'}</div>
              <p className="text-xs text-[#94a3b8] mt-1 whitespace-pre-line break-words">{form.message || 'Mesaj metni burada görünür.'}</p>
              <div className="text-[10px] text-[#64748b] mt-2">şimdi{form.link ? ` · ${form.link}` : ''}</div>
            </div>
          </div>
        </aside>
      </div>

      <section className="bg-[#10121a] rounded-2xl border border-[#1c1f2b] overflow-hidden">
        <h2 className="px-6 pt-5 pb-3 font-display font-bold text-base text-white">Gönderim geçmişi</h2>
        {history.data?.items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-y border-[#1c1f2b] text-[#64748b]">
                  <th className="text-left px-6 py-2.5">Tarih</th>
                  <th className="text-left px-4 py-2.5">Bildirim</th>
                  <th className="text-left px-4 py-2.5">Kime</th>
                  <th className="text-right px-4 py-2.5">Alıcı</th>
                  <th className="text-right px-6 py-2.5">E-posta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c1f2b]">
                {history.data.items.map((b) => (
                  <tr key={b.id} className="align-top">
                    <td className="px-6 py-3 text-[#94a3b8] whitespace-nowrap">
                      {formatDateTime(b.createdAt)}
                      <div className="text-[11px] text-[#64748b]">{b.sentBy?.name ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3 max-w-[360px]">
                      <div className="text-white font-semibold">{b.title}</div>
                      <div className="text-[#94a3b8] line-clamp-2">{b.message}</div>
                    </td>
                    <td className="px-4 py-3 text-[#cbd5e1] whitespace-nowrap">
                      {b.audience.startsWith('USER:') ? b.audience.slice(5) : AUDIENCE_LABEL[b.audience] ?? b.audience}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-white">{b.recipientCount.toLocaleString('tr-TR')}</td>
                    <td className="px-6 py-3 text-right font-mono text-[#94a3b8]">{b.sendEmail ? b.emailCount.toLocaleString('tr-TR') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-6 pb-6 text-xs text-[#64748b]">{history.isPending ? 'Yükleniyor...' : 'Henüz toplu bildirim gönderilmedi.'}</p>
        )}
        {history.data && history.data.meta.totalPages > 1 && (
          <div className="px-6 pb-4">
            <Pagination page={history.data.meta.page} totalPages={history.data.meta.totalPages} onChange={setPage} />
          </div>
        )}
      </section>

      <Modal open={confirming} onClose={() => !send.isPending && setConfirming(false)} title="Bildirimi gönder">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[#94a3b8]">
            <strong className="text-white">{recipients.toLocaleString('tr-TR')}</strong> kullanıcıya bildirim gönderilecek
            {form.sendEmail ? ' ve e-posta iletilecek' : ''}. Gönderilen bildirim geri alınamaz.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirming(false)} disabled={send.isPending}>
              Vazgeç
            </Button>
            <Button className="flex-1" loading={send.isPending} onClick={submit}>
              Gönder
            </Button>
          </div>
        </div>
      </Modal>
      <Toast toast={toast} />
    </div>
  );
}
