import SupportTicketsView from '@/features/support/components/SupportTicketsView';

export const metadata = { title: 'Destek Talepleri | NexusPin' };

export default function SupportPage() {
  return <SupportTicketsView mode="user" />;
}
