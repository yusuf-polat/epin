import { Suspense } from 'react';
import type { Metadata } from 'next';
import RegisterForm from '@/features/auth/components/RegisterForm';
import { LoadingState } from '@/components/shared/LoadingState';

export const metadata: Metadata = { title: 'Kayıt Ol | NexusPin' };

export default function RegisterPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <RegisterForm />
    </Suspense>
  );
}
