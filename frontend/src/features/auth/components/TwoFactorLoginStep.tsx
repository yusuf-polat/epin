'use client';

import { useState } from 'react';
import { getErrorMessage, isApiError } from '@/lib/api';
import { FormAlert, FormField, inputClass } from '@/components/ui/FormField';
import { useTwoFactorLogin } from '../hooks/useAuthMutations';

interface TwoFactorLoginStepProps {
  challengeToken: string;
  onSuccess: () => void;
  onCancel: () => void;
}

/** Parola doğrulandıktan sonra doğrulama uygulamasındaki kodu (veya kurtarma kodunu) ister */
export default function TwoFactorLoginStep({ challengeToken, onSuccess, onCancel }: TwoFactorLoginStepProps) {
  const verify = useTwoFactorLogin();
  const [useRecovery, setUseRecovery] = useState(false);
  const [code, setCode] = useState('');
  const valid = useRecovery ? code.replace(/[^A-Za-z0-9]/g, '').length === 10 : /^\d{6}$/.test(code);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    try {
      await verify.mutateAsync({ challengeToken, code });
      onSuccess();
    } catch {
      setCode('');
    }
  };

  const expired = isApiError(verify.error) && verify.error.code === 'CHALLENGE_EXPIRED';

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <div className="p-3 rounded-xl bg-[#090a0f] border border-[#1c1f2b] flex items-start gap-3 text-xs text-[#94a3b8]">
        <span className="material-symbols-outlined text-[#38bdf8]">shield_lock</span>
        {useRecovery
          ? 'Kurulumda kaydettiğiniz kurtarma kodlarından birini giriniz. Her kod yalnızca bir kez kullanılabilir.'
          : 'Hesabınızda iki adımlı doğrulama açık. Doğrulama uygulamanızdaki 6 haneli kodu giriniz.'}
      </div>
      <FormAlert message={verify.error ? getErrorMessage(verify.error) : null} />
      <FormField label={useRecovery ? 'Kurtarma Kodu' : 'Doğrulama Kodu'}>
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(useRecovery ? e.target.value.toUpperCase().slice(0, 11) : e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode={useRecovery ? 'text' : 'numeric'}
          autoComplete="one-time-code"
          placeholder={useRecovery ? 'XXXXX-XXXXX' : '000000'}
          className={`${inputClass} text-center font-mono text-lg tracking-[0.4em]`}
        />
      </FormField>
      <button
        type="submit"
        disabled={!valid || verify.isPending}
        className="w-full py-3.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-xs transition-all disabled:opacity-50"
      >
        {verify.isPending ? 'Doğrulanıyor...' : 'Doğrula ve Giriş Yap'}
      </button>
      <div className="flex items-center justify-between text-[11px] font-bold">
        <button type="button" onClick={onCancel} className="text-[#94a3b8] hover:text-white">
          ← {expired ? 'Tekrar giriş yap' : 'Geri'}
        </button>
        <button
          type="button"
          onClick={() => {
            setUseRecovery(!useRecovery);
            setCode('');
          }}
          className="text-[#38bdf8] hover:underline"
        >
          {useRecovery ? 'Uygulama kodu kullan' : 'Kurtarma kodu kullan'}
        </button>
      </div>
    </form>
  );
}
