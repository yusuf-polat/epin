export interface ListingStep<S extends number> {
  step: S;
  label: string;
}

/** İlan sihirbazlarındaki adım göstergesi (yeni ilan ve düzenleme) */
export function ListingStepper<S extends number>({ steps, current }: { steps: readonly ListingStep<S>[]; current: S }) {
  return (
    <ol className="grid gap-2 mt-5" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
      {steps.map((s) => (
        <li
          key={s.step}
          aria-current={current === s.step ? 'step' : undefined}
          className={`p-2 rounded-xl border text-center text-[11px] font-bold ${
            current === s.step ? 'bg-[#2563eb] border-[#2563eb] text-white' : current > s.step ? 'border-emerald-500/40 text-emerald-300' : 'border-[#1c1f2b] text-[#64748b]'
          }`}
        >
          {s.step}. <span className="hidden sm:inline">{s.label}</span>
        </li>
      ))}
    </ol>
  );
}
