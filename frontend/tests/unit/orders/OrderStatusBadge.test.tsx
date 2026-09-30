import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrderStatusBadge } from '@/features/orders/components/OrderStatusBadge';

type BadgeOrder = React.ComponentProps<typeof OrderStatusBadge>['order'];

const inHours = (h: number) => new Date(Date.now() + h * 3_600_000 + 60_000).toISOString();
const base: BadgeOrder = { status: 'COMPLETED', deliveryStatus: 'DELIVERED', escrowStatus: 'HELD_IN_ESCROW', autoReleaseAt: null, deliveryDeadlineAt: null };

describe('OrderStatusBadge', () => {
  it('iptal edilen siparişi iade edildi olarak gösterir', () => {
    render(<OrderStatusBadge order={{ ...base, status: 'CANCELLED', escrowStatus: 'REFUNDED_TO_BUYER' }} />);
    expect(screen.getByText('İptal Edildi · İade Yapıldı')).toBeInTheDocument();
  });

  it('manuel teslimat bekleyen siparişte kalan süreyi gösterir', () => {
    render(<OrderStatusBadge order={{ ...base, status: 'PENDING', deliveryStatus: 'PENDING', deliveryDeadlineAt: inHours(5) }} />);
    expect(screen.getByText(/Satıcı Teslimatı Bekleniyor \(5 sa/)).toBeInTheDocument();
  });

  it('süresi dolan manuel teslimatı işaretler', () => {
    render(<OrderStatusBadge order={{ ...base, status: 'PENDING', deliveryStatus: 'PENDING', deliveryDeadlineAt: new Date(Date.now() - 1000).toISOString() }} />);
    expect(screen.getByText('Teslim Süresi Doldu')).toBeInTheDocument();
  });

  it('teslim edilmiş ve havuzdaki siparişte alıcı onayı bekler', () => {
    render(<OrderStatusBadge order={{ ...base, autoReleaseAt: inHours(20) }} />);
    expect(screen.getByText(/Onayınız Bekleniyor \(20 sa/)).toBeInTheDocument();
  });

  it('sonuçlanan escrow durumunu etiketler', () => {
    render(<OrderStatusBadge order={{ ...base, escrowStatus: 'RELEASED_TO_SELLER' }} />);
    expect(screen.getByText('Tamamlandı')).toBeInTheDocument();
  });
});
