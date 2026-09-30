import React from 'react';
import Link from 'next/link';

interface ConsentCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Metin içinde bağlantı olarak gösterilecek belgeler */
  documents: { href: string; label: string }[];
  /** Son bağlantıya bitişik eklenir (ör. "'ni okudum, kabul ediyorum.") */
  suffix: string;
  error?: string;
}

/** Sözleşme onay kutusu; belgeler yeni sekmede açılır */
export const ConsentCheckbox = React.forwardRef<HTMLInputElement, ConsentCheckboxProps>(function ConsentCheckbox(
  { documents, suffix, error, ...input },
  ref
) {
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-start gap-2.5 text-[11px] text-[#94a3b8] leading-relaxed cursor-pointer">
        <input ref={ref} type="checkbox" className="mt-0.5 w-4 h-4 accent-[#2563eb] shrink-0" {...input} />
        <span>
          {documents.map((d, i) => (
            <React.Fragment key={d.href}>
              {i > 0 && (i === documents.length - 1 ? ' ve ' : ', ')}
              <Link href={d.href} target="_blank" className="font-bold text-[#38bdf8] hover:underline">
                {d.label}
              </Link>
            </React.Fragment>
          ))}
          {suffix}
        </span>
      </label>
      {error && <span className="text-[11px] font-semibold text-rose-400">{error}</span>}
    </div>
  );
});
