import { Suspense } from 'react';
import WalletView from '@/features/wallet/components/WalletView';
import { LoadingState } from '@/components/shared/LoadingState';

export const metadata = { title: 'Cüzdanım | NexusPin' };

export default function WalletPage() {
  return (
    <Suspense fallback={<LoadingState label="Cüzdan yükleniyor..." />}>
      <WalletView />
    </Suspense>
  );
}
