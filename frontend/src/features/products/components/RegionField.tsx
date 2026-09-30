'use client';

import { UseFormRegisterReturn } from 'react-hook-form';
import { FormField, inputClass } from '@/components/ui/FormField';
import { REGIONS, regionHint } from '../regions';

/** İlanın kodunun etkinleştirilebileceği bölge; alıcıya ürün sayfasında uyarı olarak gösterilir */
export function RegionField({ registration, value, error }: { registration: UseFormRegisterReturn; value: string; error?: string }) {
  return (
    <FormField label="Bölge" error={error} hint={error ? undefined : regionHint(value) ?? undefined}>
      <select className={inputClass} {...registration}>
        {REGIONS.map((r) => (
          <option key={r.code} value={r.code}>
            {r.label}
          </option>
        ))}
      </select>
    </FormField>
  );
}
