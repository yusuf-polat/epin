import OrderDetailView from '@/features/orders/components/OrderDetailView';

export const metadata = { title: 'Sipariş Detayı | NexusPin' };

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  return <OrderDetailView id={params.id} />;
}
