import { Suspense } from 'react';
import type { Metadata } from 'next';
import LoginForm from '@/features/auth/components/LoginForm';
import { LoadingState } from '@/components/shared/LoadingState';

export const metadata: Metadata = { title: 'Giriş Yap | NexusPin' };

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <LoginForm />
    </Suspense>
  );
}
