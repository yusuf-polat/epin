import SupportTicketsView from '@/features/support/components/SupportTicketsView';

export const metadata = { title: 'Destek Masası | NexusPin Yönetim' };

export default function StaffSupportPage() {
  return <SupportTicketsView mode="staff" />;
}
