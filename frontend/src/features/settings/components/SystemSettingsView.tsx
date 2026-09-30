'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { getErrorMessage } from '@/lib/api';
import { formatTRY } from '@/lib/utils/format';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Toast, useToast } from '@/components/shared/Toast';
import { Button } from '@/components/ui/Button';
import { FormField, inputClass } from '@/components/ui/FormField';
import { useCommissionSettings, useSmtpSettings, useTestSmtp, useUpdateCommission, useUpdateSmtp } from '../hooks/useSettings';
import { CommissionFormInput, commissionSchema, CommissionValues, SmtpFormInput, smtpSchema, SmtpValues, withdrawalFee } from '../schemas/settings.schema';
import { CommissionSettings, SmtpSettings } from '../types';

type Notify = (msg: string, ok: boolean) => void;

const SMTP_PRESETS: { label: string; host: string; port: number; secure: boolean; note: string }[] = [
  { label: 'Gmail', host: 'smtp.gmail.com', port: 465, secure: true, note: 'Google hesabında 2 adımlı doğrulama açıp "Uygulama şifresi" oluşturun; normal şifre çalışmaz.' },
  { label: 'Outlook / Office 365', host: 'smtp.office365.com', port: 587, secure: false, note: 'Microsoft 365 yöneticinizin SMTP AUTH\'u açmış olması gerekir.' },
  { label: 'Yandex', host: 'smtp.yandex.com', port: 465, secure: true, note: 'Yandex Mail ayarlarından uygulama şifresi oluşturun.' },
  { label: 'Brevo', host: 'smtp-relay.brevo.com', port: 587, secure: false, note: 'Kullanıcı: Brevo SMTP giriş adresi, şifre: SMTP anahtarı.' },
  { label: 'SendGrid', host: 'smtp.sendgrid.net', port: 587, secure: false, note: 'Kullanıcı adı "apikey", şifre: SendGrid API anahtarı.' },
];

const sectionClass = 'bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] flex flex-col gap-5';

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className={sectionClass}>
      <div>
        <h2 className="font-display font-bold text-base text-white">{title}</h2>
        <p className="text-xs text-[#94a3b8] mt-1 max-w-2xl">{description}</p>
      </div>
      {children}
    </section>
  );
}

// ─── Komisyon ───────────────────────────────────────────────────────────────────
function CommissionForm({ settings, notify }: { settings: CommissionSettings; notify: Notify }) {
  const update = useUpdateCommission();
  const { register, handleSubmit, watch, reset, formState } = useForm<CommissionFormInput, unknown, CommissionValues>({
    resolver: zodResolver(commissionSchema),
    defaultValues: settings,
  });
  useEffect(() => reset(settings), [settings, reset]);
  const v = watch();
  const sale = Number(v.defaultSalePercent) || 0;
  const fee = withdrawalFee(500, { withdrawalPercent: Number(v.withdrawalPercent) || 0, withdrawalFixed: Number(v.withdrawalFixed) || 0 });

  const submit = handleSubmit(async (values) => {
    try {
      await update.mutateAsync(values);
      notify('Komisyon ayarları kaydedildi. Yeni oranlar bundan sonraki işlemlere uygulanır.', true);
    } catch (err) {
      notify(getErrorMessage(err), false);
    }
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <FormField label="Varsayılan satış komisyonu (%)" error={formState.errors.defaultSalePercent?.message} hint="Kategoride özel oran yoksa uygulanır">
          <input type="number" step="0.01" min={0} max={50} className={inputClass} {...register('defaultSalePercent')} />
        </FormField>
        <FormField label="Para çekme komisyonu (%)" error={formState.errors.withdrawalPercent?.message}>
          <input type="number" step="0.01" min={0} max={50} className={inputClass} {...register('withdrawalPercent')} />
        </FormField>
        <FormField label="Para çekme sabit ücreti (₺)" error={formState.errors.withdrawalFixed?.message}>
          <input type="number" step="0.01" min={0} className={inputClass} {...register('withdrawalFixed')} />
        </FormField>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-4 rounded-xl bg-[#090a0f] border border-[#1c1f2b] text-[#94a3b8]">
          <div className="text-white font-semibold mb-1">Örnek satış</div>
          {formatTRY(1000)} satışta platform {formatTRY((1000 * sale) / 100)} alır, satıcıya {formatTRY(1000 - (1000 * sale) / 100)} geçer.
        </div>
        <div className="p-4 rounded-xl bg-[#090a0f] border border-[#1c1f2b] text-[#94a3b8]">
          <div className="text-white font-semibold mb-1">Örnek para çekme</div>
          {formatTRY(500)} çekimde {formatTRY(fee)} ücret kesilir, satıcının hesabına {formatTRY(Math.max(0, 500 - fee))} gönderilir.
        </div>
      </div>
      <p className="text-[11px] text-[#64748b]">
        Kategori bazlı satış oranları Kategoriler ekranından ayarlanır. Değişiklikler yalnızca yeni siparişlere ve yeni para çekme taleplerine uygulanır; mevcut kayıtlar
        oluşturuldukları andaki oranla kalır.
      </p>
      <div className="flex justify-end">
        <Button type="submit" loading={update.isPending} disabled={!formState.isDirty}>
          Kaydet
        </Button>
      </div>
    </form>
  );
}

// ─── SMTP ───────────────────────────────────────────────────────────────────────
function SmtpForm({ settings, notify }: { settings: SmtpSettings; notify: Notify }) {
  const update = useUpdateSmtp();
  const test = useTestSmtp();
  const [clearPassword, setClearPassword] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [presetNote, setPresetNote] = useState<string | null>(null);
  const toForm = (s: SmtpSettings): SmtpFormInput => ({ enabled: s.enabled, host: s.host, port: s.port, secure: s.secure, user: s.user, pass: '', fromName: s.fromName, fromEmail: s.fromEmail });
  const { register, handleSubmit, setValue, watch, reset, formState } = useForm<SmtpFormInput, unknown, SmtpValues>({
    resolver: zodResolver(smtpSchema),
    defaultValues: toForm(settings),
  });
  useEffect(() => reset(toForm(settings)), [settings, reset]);
  const enabled = watch('enabled');
  const errors = formState.errors;

  const submit = handleSubmit(async ({ pass, ...values }) => {
    try {
      await update.mutateAsync({ ...values, pass: clearPassword ? null : pass || undefined });
      setClearPassword(false);
      notify('E-posta ayarları kaydedildi.', true);
    } catch (err) {
      notify(getErrorMessage(err), false);
    }
  });

  const sendTest = async () => {
    try {
      const res = await test.mutateAsync(testTo.trim());
      notify(res.message ?? 'Test e-postası gönderildi.', true);
    } catch (err) {
      notify(getErrorMessage(err), false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div
        className={`p-3 rounded-xl border text-xs ${
          settings.enabled ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' : settings.envConfigured ? 'bg-[#090a0f] border-[#1c1f2b] text-[#94a3b8]' : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
        }`}
      >
        {settings.enabled
          ? 'E-postalar bu ayarlarla gönderiliyor.'
          : settings.envConfigured
            ? 'Panel ayarı kapalı; e-postalar sunucudaki .env SMTP ayarlarıyla gönderiliyor.'
            : 'SMTP tanımlı değil: doğrulama, şifre sıfırlama ve bildirim e-postaları gönderilmiyor.'}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-5">
        <label className="flex items-center gap-2 text-sm font-semibold text-white cursor-pointer">
          <input type="checkbox" className="accent-[#2563eb] w-4 h-4" {...register('enabled')} />
          Bu SMTP ayarlarını kullan
        </label>

        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-[#64748b] self-center mr-1">Hazır ayar:</span>
          {SMTP_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setValue('host', p.host, { shouldDirty: true });
                setValue('port', p.port, { shouldDirty: true });
                setValue('secure', p.secure, { shouldDirty: true });
                setPresetNote(p.note);
              }}
              className="px-3 py-1.5 rounded-lg border border-[#23293a] text-xs font-semibold text-[#cbd5e1] hover:bg-[#161824]"
            >
              {p.label}
            </button>
          ))}
        </div>
        {presetNote && <p className="text-[11px] text-amber-200 -mt-2">{presetNote}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_auto] gap-4 items-end">
          <FormField label="SMTP sunucusu" error={errors.host?.message}>
            <input className={inputClass} placeholder="smtp.alanadi.com" autoComplete="off" {...register('host')} />
          </FormField>
          <FormField label="Port" error={errors.port?.message}>
            <input type="number" className={inputClass} {...register('port')} />
          </FormField>
          <label className="flex items-center gap-2 text-xs text-white pb-3 cursor-pointer" title="465 portu için açık, 587 (STARTTLS) için kapalı">
            <input type="checkbox" className="accent-[#2563eb]" {...register('secure')} />
            SSL/TLS
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Kullanıcı adı" error={errors.user?.message}>
            <input className={inputClass} autoComplete="off" {...register('user')} />
          </FormField>
          <FormField label="Şifre" hint={settings.hasPassword ? 'Kayıtlı şifre korunur; değiştirmek için yenisini yazın.' : undefined}>
            <div className="flex gap-2">
              <input
                type="password"
                autoComplete="new-password"
                disabled={clearPassword}
                placeholder={clearPassword ? 'Kaydedince silinecek' : settings.hasPassword ? '•••••••• (kayıtlı)' : ''}
                className={inputClass}
                {...register('pass')}
              />
              {settings.hasPassword && (
                <button type="button" onClick={() => setClearPassword(!clearPassword)} className="px-3 rounded-xl text-[11px] font-bold border border-[#23293a] text-rose-300 shrink-0">
                  {clearPassword ? 'Geri Al' : 'Sil'}
                </button>
              )}
            </div>
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Gönderen adı" error={errors.fromName?.message}>
            <input className={inputClass} placeholder="NexusPin" {...register('fromName')} />
          </FormField>
          <FormField label="Gönderen e-posta" error={errors.fromEmail?.message} hint="Çoğu sağlayıcı yalnızca doğrulanmış adresten gönderime izin verir">
            <input type="email" className={inputClass} placeholder="no-reply@alanadi.com" {...register('fromEmail')} />
          </FormField>
        </div>

        <div className="flex justify-end">
          <Button type="submit" loading={update.isPending} disabled={!formState.isDirty && !clearPassword}>
            {enabled ? 'Kaydet ve Kullan' : 'Kaydet'}
          </Button>
        </div>
      </form>

      <div className="pt-5 border-t border-[#1c1f2b] flex flex-col sm:flex-row gap-3 sm:items-end">
        <FormField label="Test e-postası gönder" hint="Kayıtlı ayarlarla gönderilir; önce kaydedin" className="flex-1">
          <input type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="ornek@alanadi.com" className={inputClass} />
        </FormField>
        <Button variant="secondary" loading={test.isPending} disabled={!/^\S+@\S+\.\S+$/.test(testTo)} onClick={sendTest}>
          Test Gönder
        </Button>
      </div>
    </div>
  );
}

export default function SystemSettingsView() {
  const commission = useCommissionSettings();
  const smtp = useSmtpSettings();
  const { toast, show } = useToast();
  const notify: Notify = (msg, ok) => show(msg, ok ? 'success' : 'error');

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b]">
        <h1 className="font-display font-bold text-xl text-white">Sistem Ayarları</h1>
        <p className="text-xs text-[#94a3b8] mt-1">Platform komisyonları ve e-posta gönderimi. Değişiklikler işlem geçmişine kaydedilir.</p>
      </div>

      <Section title="Komisyon ve ücretler" description="Satışlardan alınan platform payı ve satıcıların para çekme işlemlerinden kesilen ücret.">
        {commission.isPending ? (
          <LoadingState />
        ) : commission.isError ? (
          <ErrorState message={getErrorMessage(commission.error)} onRetry={() => commission.refetch()} />
        ) : (
          <CommissionForm settings={commission.data} notify={notify} />
        )}
      </Section>

      <Section
        title="E-posta (SMTP)"
        description="Doğrulama, şifre sıfırlama, 2FA ve toplu bildirim e-postaları bu sunucu üzerinden gönderilir. Şifre şifrelenerek saklanır ve bir daha gösterilmez."
      >
        {smtp.isPending ? (
          <LoadingState />
        ) : smtp.isError ? (
          <ErrorState message={getErrorMessage(smtp.error)} onRetry={() => smtp.refetch()} />
        ) : (
          <SmtpForm settings={smtp.data} notify={notify} />
        )}
      </Section>
      <Toast toast={toast} />
    </div>
  );
}
