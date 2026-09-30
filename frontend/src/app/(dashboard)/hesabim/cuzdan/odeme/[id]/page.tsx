import { Suspense } from 'react';
import type { Metadata } from 'next';
import PaymentResultView from '@/features/payments/components/PaymentResultView';
import { LoadingState } from '@/components/shared/LoadingState';

export const metadata: Metadata = { title: 'Ödeme | NexusPin', robots: { index: false } };

export default function PaymentPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<LoadingState />}>
      <PaymentResultView id={params.id} />
    </Suspense>
  );
}
