import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isApiError } from '@/lib/api';
import { storeApi } from '@/features/stores/services/store.api';
import StoreProfile from '@/features/stores/components/StoreProfile';

interface Props {
  params: { slug: string };
  searchParams: { page?: string };
}

async function loadStore(slug: string) {
  try {
    return await storeApi.getBySlug(slug);
  } catch (err) {
    if (isApiError(err) && err.status === 404) return null;
    throw err;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const store = await loadStore(params.slug);
  // Metadata streaming'den önce çözüldüğü için burada notFound() gerçek 404 status üretir
  if (!store) notFound();
  return { title: `${store.name} | NexusPin Mağaza`, description: store.description ?? `${store.name} mağazasının ilanları` };
}

export default async function StorePage({ params, searchParams }: Props) {
  const store = await loadStore(params.slug);
  if (!store) notFound();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const products = await storeApi.products(store.slug, page).catch(() => null);

  return (
    <StoreProfile
      store={store}
      products={products?.items ?? []}
      meta={products?.meta ?? { page: 1, limit: 12, total: 0, totalPages: 1 }}
    />
  );
}
