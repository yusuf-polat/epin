import Link from 'next/link';

interface LinkPaginationProps {
  page: number;
  totalPages: number;
  basePath: string;
  searchParams: Record<string, string | undefined>;
}

/** Sunucu tarafında render edilen, URL tabanlı sayfalama */
export function LinkPagination({ page, totalPages, basePath, searchParams }: LinkPaginationProps) {
  if (totalPages <= 1) return null;
  const href = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (v && k !== 'page') qs.set(k, v);
    if (p > 1) qs.set('page', String(p));
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  const btn = 'px-3 py-1.5 rounded-lg text-xs font-bold border border-[#1c1f2b] text-[#94a3b8] hover:text-white transition-all';
  return (
    <nav className="flex items-center justify-center gap-2 mt-8" aria-label="Sayfalama">
      {page > 1 ? <Link className={btn} href={href(page - 1)}>Önceki</Link> : <span className={`${btn} opacity-40`}>Önceki</span>}
      <span className="text-xs text-[#64748b] font-mono">
        {page} / {totalPages}
      </span>
      {page < totalPages ? <Link className={btn} href={href(page + 1)}>Sonraki</Link> : <span className={`${btn} opacity-40`}>Sonraki</span>}
    </nav>
  );
}
