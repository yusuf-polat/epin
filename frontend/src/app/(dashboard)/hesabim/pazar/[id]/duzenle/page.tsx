import EditListingForm from '@/features/products/components/EditListingForm';

export const metadata = { title: 'İlanı Düzenle | NexusPin' };

export default function EditListingPage({ params }: { params: { id: string } }) {
  return <EditListingForm id={params.id} />;
}
