interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onChange }: PaginationProps) {
  if (totalPages <= 1) return null;
  const btn = 'px-3 py-1.5 rounded-lg text-xs font-bold border border-[#1c1f2b] transition-all disabled:opacity-40';
  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button type="button" className={`${btn} text-[#94a3b8] hover:text-white`} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Önceki
      </button>
      <span className="text-xs text-[#64748b] font-mono">
        {page} / {totalPages}
      </span>
      <button type="button" className={`${btn} text-[#94a3b8] hover:text-white`} disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Sonraki
      </button>
    </div>
  );
}
