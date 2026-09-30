import { describe, expect, it, vi } from 'vitest';
import { GUEST_CART_STORAGE_KEY, MAX_ITEM_QUANTITY } from '@/features/cart/constants';

const line = { variantId: 'v1', quantity: 1, unitPrice: 50, title: 'Valorant 1000 VP', denomination: '1000 VP' };

// Modül içi önbellek her testte sıfırlansın diye dinamik import
async function loadCart() {
  vi.resetModules();
  return (await import('@/features/cart/services/guest-cart.storage')).guestCart;
}

describe('guestCart', () => {
  it('aynı varyantı birleştirir ve depolamaya yazar', async () => {
    const cart = await loadCart();
    cart.add(line);
    cart.add({ ...line, quantity: 2 });
    expect(cart.getSnapshot()).toEqual([{ ...line, quantity: 3 }]);
    expect(JSON.parse(localStorage.getItem(GUEST_CART_STORAGE_KEY) ?? '[]')).toHaveLength(1);
  });

  it('adedi üst sınırla kısıtlar, 0 olunca satırı siler', async () => {
    const cart = await loadCart();
    cart.add({ ...line, quantity: MAX_ITEM_QUANTITY + 5 });
    expect(cart.getSnapshot()[0].quantity).toBe(MAX_ITEM_QUANTITY);
    cart.setQuantity('v1', 0);
    expect(cart.getSnapshot()).toEqual([]);
    expect(localStorage.getItem(GUEST_CART_STORAGE_KEY)).toBeNull();
  });

  it('bozuk depolama verisini yok sayar', async () => {
    localStorage.setItem(GUEST_CART_STORAGE_KEY, '{bozuk');
    const cart = await loadCart();
    expect(cart.getSnapshot()).toEqual([]);
  });

  it('abonelere değişikliği bildirir', async () => {
    const cart = await loadCart();
    const listener = vi.fn();
    const unsubscribe = cart.subscribe(listener);
    cart.add(line);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    cart.clear();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
