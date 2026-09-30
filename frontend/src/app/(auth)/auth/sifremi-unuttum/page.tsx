import type { Metadata } from 'next';
import ForgotPasswordForm from '@/features/auth/components/ForgotPasswordForm';

export const metadata: Metadata = { title: 'Şifremi Unuttum | NexusPin' };

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
