import { Suspense } from 'react';
import type { Metadata } from 'next';
import VerifyEmailView from '@/features/auth/components/VerifyEmailView';
import { LoadingState } from '@/components/shared/LoadingState';

export const metadata: Metadata = { title: 'E-posta Doğrulama | NexusPin', robots: { index: false } };

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <VerifyEmailView />
    </Suspense>
  );
}
