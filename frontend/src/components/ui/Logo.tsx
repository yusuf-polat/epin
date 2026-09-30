import { cn } from '@/lib/utils/cn';

/**
 * NexusPin marka işareti: köşesi kesik bir kod kartı içinde "N".
 * İkon fontu yerine SVG çizildiği için her boyutta keskin ve markaya özeldir.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('w-8 h-8 shrink-0', className)}>
      <path d="M4 3h19l5 5v19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" fill="#2563eb" />
      <path d="M23 3v5h5" fill="#1d4ed8" />
      <path d="M9.5 22.5v-13l9 13v-13" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="23" cy="22.5" r="1.8" fill="#7dd3fc" />
    </svg>
  );
}

export function Logo({ className, markClassName, showTagline = false }: { className?: string; markClassName?: string; showTagline?: boolean }) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <LogoMark className={markClassName} />
      <span className="flex flex-col">
        <span className="font-display font-bold text-xl tracking-tight text-white leading-none">
          nexus<span className="text-[#7dd3fc]">pin</span>
        </span>
        {showTagline && <span className="hidden sm:block text-[10px] text-[#64748b] mt-1 leading-none">Dijital kod pazar yeri</span>}
      </span>
    </span>
  );
}
