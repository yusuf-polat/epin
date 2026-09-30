'use client';

import { useState } from 'react';
import { getErrorMessage } from '@/lib/api';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { Button } from '@/components/ui/Button';
import { FormAlert, FormField, inputClass } from '@/components/ui/FormField';
import { useDisableTwoFactor, useEnableTwoFactor, useRegenerateRecoveryCodes, useTwoFactorSetup, useTwoFactorStatus } from '../hooks/useAuthMutations';

const codeInput = `${inputClass} font-mono tracking-widest`;

/** Kurulumdan sonra bir kez gösterilen kurtarma kodları */
function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const { copiedKey, copy } = useCopyToClipboard();
  const text = codes.join('\n');
  const download = () => {
    const url = URL.createObjectURL(new Blob([`NexusPin kurtarma kodları\n\n${text}\n`], { type: 'text/plain' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'nexuspin-kurtarma-kodlari.txt' });
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="flex flex-col gap-4">
      <FormAlert type="success" message="Kurtarma kodlarınızı güvenli bir yere kaydedin. Telefonunuza erişemezseniz bu kodlarla giriş yapabilirsiniz; her kod bir kez kullanılır. Bu kodlar bir daha gösterilmeyecek." />
      <div className="grid grid-cols-2 gap-2 p-4 rounded-xl bg-[#090a0f] border border-[#1c1f2b]">
        {codes.map((c) => (
          <code key={c} className="font-mono text-sm text-emerald-300 text-center">
            {c}
          </code>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => void copy(text)}>
          {copiedKey === text ? 'Kopyalandı' : 'Kopyala'}
        </Button>
        <Button variant="secondary" onClick={download}>
          İndir (.txt)
        </Button>
        <Button className="ml-auto" onClick={onDone}>
          Kaydettim
        </Button>
      </div>
    </div>
  );
}

function EnableFlow({ onEnabled }: { onEnabled: (codes: string[]) => void }) {
  const setup = useTwoFactorSetup();
  const enable = useEnableTwoFactor();
  const [code, setCode] = useState('');

  if (!setup.data) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs text-[#94a3b8]">
          Girişte şifrenize ek olarak telefonunuzdaki doğrulama uygulamasının (Google Authenticator, Microsoft Authenticator, Authy vb.) ürettiği kod istenir. Hesabınız ve bakiyeniz için önerilir.
        </p>
        <FormAlert message={setup.error ? getErrorMessage(setup.error) : null} />
        <Button className="self-start" loading={setup.isPending} onClick={() => setup.mutate()}>
          İki Adımlı Doğrulamayı Aç
        </Button>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await enable.mutateAsync({ setupToken: setup.data.setupToken, code });
      onEnabled(res.recoveryCodes);
    } catch {
      setCode('');
    }
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-5">
      <img src={setup.data.qrDataUrl} alt="Doğrulama uygulaması için QR kod" className="w-[220px] h-[220px] rounded-xl bg-white p-2" />
      <div className="flex flex-col gap-4 min-w-0">
        <ol className="text-xs text-[#94a3b8] list-decimal pl-4 flex flex-col gap-1">
          <li>Doğrulama uygulamasında &quot;hesap ekle&quot;yi seçip QR kodu okutun.</li>
          <li>QR okutamıyorsanız aşağıdaki anahtarı elle girin.</li>
          <li>Uygulamanın gösterdiği 6 haneli kodu yazıp onaylayın.</li>
        </ol>
        <code className="block p-3 rounded-xl bg-[#090a0f] border border-[#1c1f2b] font-mono text-xs text-white break-all">{setup.data.secret}</code>
        <FormField label="Doğrulama Kodu">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            className={codeInput}
          />
        </FormField>
        <FormAlert message={enable.error ? getErrorMessage(enable.error) : null} />
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setup.reset()}>
            Vazgeç
          </Button>
          <Button type="submit" loading={enable.isPending} disabled={code.length !== 6}>
            Onayla ve Aç
          </Button>
        </div>
      </div>
    </form>
  );
}

function ManageFlow({ recoveryCodesLeft, onCodes }: { recoveryCodesLeft: number; onCodes: (codes: string[]) => void }) {
  const disable = useDisableTwoFactor();
  const regenerate = useRegenerateRecoveryCodes();
  const [mode, setMode] = useState<'idle' | 'disable' | 'regenerate'>('idle');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const error = disable.error ?? regenerate.error;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === 'disable') await disable.mutateAsync({ password, code });
      else onCodes((await regenerate.mutateAsync(code)).recoveryCodes);
      setMode('idle');
    } catch {
      setCode('');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-xs">
        <span className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">Açık</span>
        <span className={recoveryCodesLeft <= 2 ? 'text-amber-300' : 'text-[#94a3b8]'}>{recoveryCodesLeft} kullanılmamış kurtarma kodu</span>
      </div>
      {mode === 'idle' ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setMode('regenerate')}>
            Yeni Kurtarma Kodları
          </Button>
          <Button variant="danger" onClick={() => setMode('disable')}>
            Kapat
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4 p-4 rounded-xl bg-[#090a0f] border border-[#1c1f2b]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mode === 'disable' && (
              <FormField label="Şifreniz">
                <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
              </FormField>
            )}
            <FormField label="Doğrulama veya kurtarma kodu">
              <input value={code} onChange={(e) => setCode(e.target.value.slice(0, 11))} autoComplete="one-time-code" className={codeInput} />
            </FormField>
          </div>
          <FormAlert message={error ? getErrorMessage(error) : null} />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setMode('idle')}>
              Vazgeç
            </Button>
            <Button type="submit" variant={mode === 'disable' ? 'danger' : 'primary'} loading={disable.isPending || regenerate.isPending} disabled={code.length < 6 || (mode === 'disable' && !password)}>
              {mode === 'disable' ? 'İki Adımlı Doğrulamayı Kapat' : 'Kodları Yenile'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function TwoFactorSettings() {
  const status = useTwoFactorStatus();
  const [codes, setCodes] = useState<string[] | null>(null);

  return (
    <section className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[#38bdf8]">shield_lock</span>
        <h2 className="font-display font-bold text-base text-white">İki Adımlı Doğrulama (2FA)</h2>
      </div>
      {codes ? (
        <RecoveryCodes codes={codes} onDone={() => setCodes(null)} />
      ) : status.isPending ? (
        <p className="text-xs text-[#64748b]">Yükleniyor...</p>
      ) : status.data?.enabled ? (
        <ManageFlow recoveryCodesLeft={status.data.recoveryCodesLeft} onCodes={setCodes} />
      ) : (
        <EnableFlow onEnabled={setCodes} />
      )}
    </section>
  );
}
