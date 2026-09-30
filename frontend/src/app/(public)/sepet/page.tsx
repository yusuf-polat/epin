import type { Metadata } from 'next';
import CartView from '@/features/cart/components/CartView';

export const metadata: Metadata = { title: 'Sepet | NexusPin' };

export default function CartPage() {
  return <CartView />;
}
