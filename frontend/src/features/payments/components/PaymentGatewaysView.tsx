'use client';

import { useState } from 'react';
import { getErrorMessage } from '@/lib/api';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Toast, useToast } from '@/components/shared/Toast';
import { Button } from '@/components/ui/Button';
import { FormAlert, FormField, inputClass } from '@/components/ui/FormField';
import { useGateways, useUpdateGateway } from '../hooks/usePayments';
import { feeLabel, PROVIDER_META } from '../constants';
import { AdminGateway, UpdateGatewayInput } from '../types';

const KIND_LABEL = { manual: 'Yönetici onaylı', redirect: 'Yönlendirmeli ödeme', iframe: 'Gömülü ödeme formu' } as const;

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`w-10 h-6 rounded-full p-0.5 transition-colors ${checked ? 'bg-emerald-500' : 'bg-[#2c3245]'}`}
      >
        <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </button>
      {label}
    </label>
  );
}

interface Draft {
  isEnabled: boolean;
  testMode: boolean;
  displayName: string;
  description: string;
  sortOrder: string;
  minAmount: string;
  maxAmount: string;
  feePercent: string;
  feeFixed: string;
  settings: Record<string, string>;
  /** Yalnızca yeni girilen gizli değerler (boş: mevcut korunur) */
  secrets: Record<string, string>;
  clear: string[];
}

const toDraft = (g: AdminGateway): Draft => ({
  isEnabled: g.isEnabled,
  testMode: g.testMode,
  displayName: g.displayName,
  description: g.description ?? '',
  sortOrder: String(g.sortOrder),
  minAmount: String(g.minAmount),
  maxAmount: String(g.maxAmount),
  feePercent: String(g.feePercent),
  feeFixed: String(g.feeFixed),
  settings: { ...g.settings },
  secrets: {},
  clear: [],
});

function toInput(d: Draft): UpdateGatewayInput {
  const secrets: Record<string, string | null> = { ...d.secrets };
  for (const key of d.clear) secrets[key] = null;
  return {
    isEnabled: d.isEnabled,
    testMode: d.testMode,
    displayName: d.displayName.trim(),
    description: d.description.trim() || null,
    sortOrder: Number(d.sortOrder) || 0,
    minAmount: Number(d.minAmount),
    maxAmount: Number(d.maxAmount),
    feePercent: Number(d.feePercent) || 0,
    feeFixed: Number(d.feeFixed) || 0,
    settings: d.settings,
    secrets,
  };
}

function CopyField({ label, value }: { label: string; value: string }) {
  const { copiedKey, copy } = useCopyToClipboard();
  return (
    <div className="p-3 rounded-xl bg-[#090a0f] border border-[#1c1f2b] flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-[#64748b] font-bold">{label}</div>
        <code className="text-xs text-white break-all">{value}</code>
      </div>
      <button type="button" onClick={() => void copy(value)} className="px-2.5 py-1 rounded-lg bg-[#161824] border border-[#222534] text-[11px] font-bold text-[#38bdf8] shrink-0">
        {copiedKey === value ? 'Kopyalandı' : 'Kopyala'}
      </button>
    </div>
  );
}

function GatewayCard({ gateway, notify }: { gateway: AdminGateway; notify: (msg: string, ok: boolean) => void }) {
  const update = useUpdateGateway();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => toDraft(gateway));
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const meta = PROVIDER_META[gateway.provider];

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const saved = await update.mutateAsync({ provider: gateway.provider, input: toInput(draft) });
      setDraft(toDraft(saved));
      notify(`${saved.displayName} ayarları kaydedildi.`, true);
    } catch (err) {
      notify(getErrorMessage(err), false);
    }
  };

  const status = gateway.isEnabled
    ? gateway.missingFields.length
      ? { label: 'Eksik ayar', className: 'text-amber-300 bg-amber-500/10 border-amber-500/30' }
      : { label: 'Açık', className: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' }
    : { label: 'Kapalı', className: 'text-slate-300 bg-slate-500/10 border-slate-500/30' };

  return (
    <div className="bg-[#10121a] rounded-2xl border border-[#1c1f2b] overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="w-full p-5 flex items-center gap-4 text-left hover:bg-white/[0.02]" aria-expanded={open}>
        <div className="w-11 h-11 rounded-xl bg-[#161a28] border border-[#232a40] text-[#38bdf8] flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined">{meta.icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-display font-bold text-sm text-white">{gateway.label}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${status.className}`}>{status.label}</span>
            {gateway.isEnabled && gateway.testMode && gateway.kind !== 'manual' && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300">TEST</span>
            )}
          </div>
          <div className="text-[11px] text-[#64748b] mt-0.5">
            {KIND_LABEL[gateway.kind]} · {feeLabel(gateway)} · Kullanıcıya görünen ad: {gateway.displayName}
          </div>
        </div>
        <span className="material-symbols-outlined text-[#64748b]">{open ? 'expand_less' : 'expand_more'}</span>
      </button>

      {open && (
        <form onSubmit={save} className="p-5 pt-0 flex flex-col gap-5 border-t border-[#1c1f2b]">
          <div className="flex flex-wrap gap-6 pt-5">
            <Toggle checked={draft.isEnabled} onChange={(v) => set('isEnabled', v)} label="Kullanıcılara açık" />
            {gateway.kind !== 'manual' && <Toggle checked={draft.testMode} onChange={(v) => set('testMode', v)} label="Test (sandbox) modu" />}
          </div>
          {gateway.missingFields.length > 0 && <FormAlert message={`Açmadan önce doldurulması gerekenler: ${gateway.missingFields.join(', ')}`} />}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Kullanıcıya görünen ad">
              <input className={inputClass} maxLength={60} value={draft.displayName} onChange={(e) => set('displayName', e.target.value)} />
            </FormField>
            <FormField label="Sıra (küçük olan önce)">
              <input className={inputClass} type="number" min={0} max={100} value={draft.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} />
            </FormField>
          </div>
          <FormField label="Açıklama">
            <input className={inputClass} maxLength={300} value={draft.description} onChange={(e) => set('description', e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <FormField label="En az (₺)">
              <input className={inputClass} type="number" step="0.01" value={draft.minAmount} onChange={(e) => set('minAmount', e.target.value)} />
            </FormField>
            <FormField label="En fazla (₺)">
              <input className={inputClass} type="number" step="0.01" value={draft.maxAmount} onChange={(e) => set('maxAmount', e.target.value)} />
            </FormField>
            <FormField label="Hizmet bedeli (%)" hint={gateway.kind === 'manual' ? undefined : 'Sağlayıcı komisyonunu kullanıcıya yansıtmak için'}>
              <input className={inputClass} type="number" step="0.01" min={0} max={20} value={draft.feePercent} onChange={(e) => set('feePercent', e.target.value)} />
            </FormField>
            <FormField label="Sabit bedel (₺)">
              <input className={inputClass} type="number" step="0.01" min={0} value={draft.feeFixed} onChange={(e) => set('feeFixed', e.target.value)} />
            </FormField>
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-bold text-[#94a3b8] uppercase tracking-wider">
              {gateway.kind === 'manual' ? 'Hesap bilgileri' : 'API bilgileri'}
              {gateway.docsUrl && (
                <a href={gateway.docsUrl} target="_blank" rel="noreferrer" className="ml-2 normal-case tracking-normal text-[#38bdf8] hover:underline">
                  Sağlayıcı paneli ↗
                </a>
              )}
            </h3>
            {gateway.fields.map((f) => {
              if (!f.secret) {
                const props = {
                  className: `${inputClass} ${f.multiline ? 'font-mono text-xs' : ''}`,
                  placeholder: f.placeholder,
                  value: draft.settings[f.key] ?? '',
                  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set('settings', { ...draft.settings, [f.key]: e.target.value }),
                };
                return (
                  <FormField key={f.key} label={`${f.label}${f.required ? '' : ' (isteğe bağlı)'}`} hint={f.hint}>
                    {f.multiline ? <textarea rows={4} {...props} /> : <input {...props} />}
                  </FormField>
                );
              }
              const stored = gateway.secrets[f.key];
              const clearing = draft.clear.includes(f.key);
              return (
                <FormField key={f.key} label={f.label} hint={f.hint ?? (stored ? 'Kayıtlı değer korunur; değiştirmek için yenisini yazın.' : undefined)}>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      autoComplete="off"
                      className={`${inputClass} font-mono`}
                      disabled={clearing}
                      placeholder={clearing ? 'Kaydedince silinecek' : stored ? `Kayıtlı: ${stored}` : f.placeholder}
                      value={draft.secrets[f.key] ?? ''}
                      onChange={(e) => set('secrets', { ...draft.secrets, [f.key]: e.target.value })}
                    />
                    {stored && (
                      <button
                        type="button"
                        onClick={() => set('clear', clearing ? draft.clear.filter((k) => k !== f.key) : [...draft.clear, f.key])}
                        className="px-3 rounded-xl text-[11px] font-bold border border-[#23293a] text-rose-300 shrink-0"
                      >
                        {clearing ? 'Geri Al' : 'Sil'}
                      </button>
                    )}
                  </div>
                </FormField>
              );
            })}
            {gateway.webhookUrl && <CopyField label="Bildirim (webhook / callback) adresi · sağlayıcı panelinde tanımlayın" value={gateway.webhookUrl} />}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#1c1f2b]">
            <Button variant="secondary" onClick={() => setDraft(toDraft(gateway))} disabled={update.isPending}>
              Değişiklikleri Geri Al
            </Button>
            <Button type="submit" loading={update.isPending}>
              Kaydet
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function PaymentGatewaysView() {
  const gateways = useGateways();
  const { toast, show } = useToast();
  const notify = (msg: string, ok: boolean) => show(msg, ok ? 'success' : 'error');

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b]">
        <h1 className="font-display font-extrabold text-xl text-white">Ödeme Yöntemleri</h1>
        <p className="text-xs text-[#64748b] mt-1 max-w-3xl">
          Kullanıcıların cüzdanlarına bakiye yükleyeceği yöntemleri yönetin. Online yöntemlerde ödeme sağlayıcının bildirimiyle doğrulanır ve bakiye otomatik yüklenir;
          havale ve kripto adres yöntemlerinde talepler Finans ekranından onaylanır. API anahtarları şifrelenerek saklanır ve bir daha gösterilmez.
        </p>
      </div>
      {gateways.isPending ? (
        <LoadingState />
      ) : gateways.isError ? (
        <ErrorState message={getErrorMessage(gateways.error)} onRetry={() => gateways.refetch()} />
      ) : (
        <div className="flex flex-col gap-3">
          {gateways.data.map((g) => (
            <GatewayCard key={g.provider} gateway={g} notify={notify} />
          ))}
        </div>
      )}
      <Toast toast={toast} />
    </div>
  );
}
