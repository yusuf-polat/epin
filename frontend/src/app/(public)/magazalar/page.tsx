import type { Metadata } from 'next';
import { storeApi } from '@/features/stores/services/store.api';
import StoresDirectory from '@/features/stores/components/StoresDirectory';

export const metadata: Metadata = { title: 'Mağazalar | NexusPin', description: 'Onaylı P2P satıcı mağazaları.' };

export default async function StoresPage({ searchParams }: { searchParams: { page?: string; search?: string } }) {
  const page = Math.max(1, Number(searchParams.page) || 1);
  const search = searchParams.search?.slice(0, 100) || undefined;
  const result = await storeApi.list({ page, limit: 12, search }).catch(() => null);

  return <StoresDirectory stores={result?.items ?? []} meta={result?.meta ?? { page: 1, limit: 12, total: 0, totalPages: 1 }} search={search} />;
}
