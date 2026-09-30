export function LoadingState({ label = 'Yükleniyor...' }: { label?: string }) {
  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3 text-xs text-[#64748b]" role="status">
      <span className="w-8 h-8 rounded-full border-2 border-[#1c1f2b] border-t-[#38bdf8] animate-spin" />
      <span>{label}</span>
    </div>
  );
}
