import Link from 'next/link';
import { LEGAL_DOCUMENTS, LegalDocument } from '../constants';

export default function LegalDocumentView({ document }: { document: LegalDocument }) {
  return (
    <div className="max-w-[1100px] mx-auto px-4 md:px-8 py-10 grid grid-cols-1 lg:grid-cols-4 gap-8">
      <nav aria-label="Sözleşmeler" className="flex lg:flex-col gap-2 overflow-x-auto">
        {LEGAL_DOCUMENTS.map((d) => (
          <Link
            key={d.slug}
            href={`/sozlesmeler/${d.slug}`}
            className={`px-3 py-2 rounded-xl text-xs font-bold border shrink-0 ${
              d.slug === document.slug ? 'bg-[#2563eb] border-[#2563eb] text-white' : 'bg-[#10121a] border-[#1c1f2b] text-[#94a3b8] hover:text-white'
            }`}
          >
            {d.shortTitle}
          </Link>
        ))}
      </nav>
      <article className="lg:col-span-3 bg-[#10121a] rounded-2xl p-6 md:p-8 border border-[#1c1f2b] flex flex-col gap-6">
        <header>
          <h1 className="font-display font-extrabold text-2xl text-white">{document.title}</h1>
          <p className="text-xs text-[#64748b] mt-1">Son güncelleme: {document.updatedAt}</p>
        </header>
        {document.sections.map((section) => (
          <section key={section.heading} className="flex flex-col gap-2">
            <h2 className="font-bold text-sm text-white">{section.heading}</h2>
            {section.paragraphs.map((p) => (
              <p key={p} className="text-sm text-[#94a3b8] leading-relaxed">
                {p}
              </p>
            ))}
          </section>
        ))}
      </article>
    </div>
  );
}
