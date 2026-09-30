import React from 'react';

/** Kimlik doğrulama sayfalarının ortak kart düzeni */
export function AuthCard({ icon, title, subtitle, children }: { icon: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-[#10121a] border border-[#1c1f2b] rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#161924] border border-[#23293a] text-[#38bdf8] flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-2xl">{icon}</span>
          </div>
          <h1 className="font-display font-black text-2xl text-white">{title}</h1>
          {subtitle && <p className="text-xs text-[#94a3b8] mt-1">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
