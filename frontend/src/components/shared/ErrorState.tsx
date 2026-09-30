interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Bir sorun oluştu', message, onRetry }: ErrorStateProps) {
  return (
    <div className="bg-rose-950/30 border border-rose-900/50 rounded-2xl p-8 text-center flex flex-col items-center gap-3" role="alert">
      <span className="material-symbols-outlined text-4xl text-rose-400">error</span>
      <h3 className="font-display font-bold text-sm text-white">{title}</h3>
      {message && <p className="text-xs text-rose-200/80 max-w-md">{message}</p>}
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-2 px-4 py-2 rounded-xl bg-[#1c1f2b] hover:bg-[#23293a] text-white text-xs font-bold transition-all">
          Tekrar Dene
        </button>
      )}
    </div>
  );
}
