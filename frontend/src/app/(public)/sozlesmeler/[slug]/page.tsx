import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { siteConfig } from '@/config/site';
import LegalDocumentView from '@/features/legal/components/LegalDocumentView';
import { findLegalDocument, LEGAL_DOCUMENTS } from '@/features/legal/constants';

export const dynamicParams = false;

export function generateStaticParams() {
  return LEGAL_DOCUMENTS.map((d) => ({ slug: d.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const doc = findLegalDocument(params.slug);
  if (!doc) notFound();
  return { title: `${doc.title} | ${siteConfig.name}` };
}

export default function LegalPage({ params }: { params: { slug: string } }) {
  const doc = findLegalDocument(params.slug);
  if (!doc) notFound();
  return <LegalDocumentView document={doc} />;
}
