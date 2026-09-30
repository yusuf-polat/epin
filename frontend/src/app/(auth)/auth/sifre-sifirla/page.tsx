import { Suspense } from 'react';
import type { Metadata } from 'next';
import ResetPasswordForm from '@/features/auth/components/ResetPasswordForm';
import { LoadingState } from '@/components/shared/LoadingState';

export const metadata: Metadata = { title: 'Şifre Sıfırla | NexusPin', robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
