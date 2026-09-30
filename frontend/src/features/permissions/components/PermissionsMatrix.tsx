'use client';

import React, { useEffect, useState } from 'react';
import { getErrorMessage } from '@/lib/api';
import { ErrorState } from '@/components/shared/ErrorState';
import { LoadingState } from '@/components/shared/LoadingState';
import { Toast, useToast } from '@/components/shared/Toast';
import { Button } from '@/components/ui/Button';
import { useRolePermissions, useSetRolePermissions } from '../hooks/usePermissions';
import { EDITABLE_ROLES, PERMISSION_DEFINITIONS } from '../constants';

type EditableRole = (typeof EDITABLE_ROLES)[number];

export default function PermissionsMatrix() {
  const [role, setRole] = useState<EditableRole>('DESTEK');
  const permissions = useRolePermissions();
  const save = useSetRolePermissions();
  // Kaydedilene kadar yerel taslak (form durumu)
  const [draft, setDraft] = useState<string[]>([]);
  const { toast, show } = useToast();

  useEffect(() => {
    if (permissions.data) setDraft(permissions.data[role]);
  }, [permissions.data, role]);

  const toggle = (key: string) => setDraft((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const onSave = async () => {
    try {
      await save.mutateAsync({ role, permissions: draft });
      show(`${role} rolünün izinleri güncellendi.`);
    } catch (err) {
      show(getErrorMessage(err), 'error');
    }
  };

  if (permissions.isPending) return <LoadingState />;
  if (permissions.isError) return <ErrorState message={getErrorMessage(permissions.error)} onRetry={() => permissions.refetch()} />;

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="bg-[#10121a] rounded-2xl p-6 border border-[#1c1f2b] flex flex-col gap-4">
        <div>
          <h1 className="font-display font-extrabold text-xl text-white">Rol & İzin Matrisi</h1>
          <p className="text-xs text-[#64748b] mt-1">İzinler backend&apos;de her istekte uygulanır. ADMIN rolü her zaman tam yetkilidir ve değiştirilemez.</p>
        </div>
        <div className="flex gap-2">
          {EDITABLE_ROLES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`px-4 py-2 rounded-lg text-xs font-bold border ${role === r ? 'bg-[#2563eb] border-[#2563eb] text-white' : 'bg-[#090a0f] border-[#1c1f2b] text-[#94a3b8]'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#10121a] rounded-2xl border border-[#1c1f2b] divide-y divide-[#1c1f2b]">
        {PERMISSION_DEFINITIONS.map((p) => (
          <label key={p.key} className="p-4 flex items-start gap-3 cursor-pointer hover:bg-[#131622]/60">
            <input type="checkbox" checked={draft.includes(p.key)} onChange={() => toggle(p.key)} className="mt-1 w-4 h-4 accent-[#2563eb]" />
            <div>
              <div className="text-sm font-bold text-white">
                {p.label} <span className="text-[10px] font-mono text-[#64748b]">{p.key}</span>
              </div>
              <div className="text-xs text-[#94a3b8]">{p.desc}</div>
              <div className="text-[10px] text-[#475569] mt-0.5">{p.category}</div>
            </div>
          </label>
        ))}
      </div>
      <div className="flex justify-end">
        <Button loading={save.isPending} onClick={onSave}>
          {role} İzinlerini Kaydet
        </Button>
      </div>
      <Toast toast={toast} />
    </div>
  );
}
