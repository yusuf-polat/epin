import { NotFoundError } from '@/utils/errors';
import { PageParams } from '@/utils/pagination';
import { pinRepository } from './pin.repository';
import { maskCode } from './pin.mapper';
import { PinView, RevealedPin } from './pin.types';

export const pinService = {
  /** Kullanıcının satın aldığı kodlar; kodun kendisi listede asla dönmez */
  async listMine(userId: string, page: PageParams): Promise<{ items: PinView[]; total: number }> {
    const { items: pins, total } = await pinRepository.findByUser(userId, page);
    const items = pins.map((p) => ({
      id: p.id,
      maskedCode: maskCode(p.code),
      serialNumber: p.serialNumber,
      soldAt: p.soldAt,
      order: p.order,
      product: {
        ...p.variant.product,
        variantTitle: p.variant.title,
        denomination: p.variant.denomination,
      },
    }));
    return { items, total };
  },

  async reveal(pinId: string, userId: string): Promise<RevealedPin> {
    const pin = await pinRepository.findOwned(pinId, userId);
    if (!pin) throw new NotFoundError('Dijital kod bulunamadı veya bu hesaba ait değil', 'PIN_NOT_FOUND');
    return {
      id: pin.id,
      code: pin.code,
      serialNumber: pin.serialNumber,
      soldAt: pin.soldAt,
      productTitle: pin.variant.product.title,
      variantTitle: pin.variant.title,
      denomination: pin.variant.denomination,
    };
  },
};
