import OpenDisputeForm from '@/features/disputes/components/OpenDisputeForm';

export const metadata = { title: 'İtiraz Aç | NexusPin' };

export default function OpenDisputePage({ params }: { params: { id: string } }) {
  return <OpenDisputeForm orderId={params.id} />;
}
