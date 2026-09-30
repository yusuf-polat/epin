import { Suspense } from 'react';
import MessagesView from '@/features/messages/components/MessagesView';
import { LoadingState } from '@/components/shared/LoadingState';

export const metadata = { title: 'Mesajlarım | NexusPin' };

export default function MessagesPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <MessagesView />
    </Suspense>
  );
}
