import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isApiError } from '@/lib/api';
import { withSessionCookie } from '@/lib/auth/session';
import { productApi } from '@/features/products/services/product.api';
import ProductDetail from '@/features/products/components/ProductDetail';

interface Props {
  params: { slug: string };
}

async function loadProduct(slug: string) {
  try {
    // Onay bekleyen ilanları sahibi/personel önizleyebilsin diye oturum cookie'si iletilir
    return await productApi.getBySlug(slug, withSessionCookie());
  } catch (err) {
    if (isApiError(err) && err.status === 404) return null;
    throw err;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await loadProduct(params.slug);
  // Metadata streaming'den önce çözüldüğü için burada notFound() gerçek 404 status üretir
  if (!product) notFound();
  return {
    title: `${product.title} | NexusPin`,
    description: product.shortDesc || product.description.slice(0, 160),
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const product = await loadProduct(params.slug);
  if (!product) notFound();
  return <ProductDetail product={product} />;
}
