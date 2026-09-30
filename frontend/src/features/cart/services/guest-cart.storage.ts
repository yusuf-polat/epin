import { GUEST_CART_STORAGE_KEY, MAX_ITEM_QUANTITY } from '../constants';
import { CartLineSnapshot } from '../types';

/**
 * Giriş yapmamış kullanıcının sepeti (istemci durumu). localStorage'da tutulur,
 * useSyncExternalStore ile bileşenlere bağlanır ve sekmeler arası senkron kalır.
 */
type Listener = () => void;
const listeners = new Set<Listener>();
const EMPTY: CartLineSnapshot[] = [];
let cache: CartLineSnapshot[] | null = null;

function read(): CartLineSnapshot[] {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(GUEST_CART_STORAGE_KEY) || '[]');
    cache = Array.isArray(parsed) ? parsed.filter((l) => l && typeof l.variantId === 'string' && l.quantity > 0) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(lines: CartLineSnapshot[]) {
  cache = lines;
  try {
    if (lines.length === 0) localStorage.removeItem(GUEST_CART_STORAGE_KEY);
    else localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Depolama engelliyse sepet yalnızca bellek içinde kalır
  }
  listeners.forEach((l) => l());
}

const clamp = (q: number) => Math.max(0, Math.min(q, MAX_ITEM_QUANTITY));

export const guestCart = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === GUEST_CART_STORAGE_KEY) {
        cache = null;
        listener();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', onStorage);
    };
  },
  getSnapshot: read,
  getServerSnapshot: () => EMPTY,

  add(line: CartLineSnapshot) {
    const current = read();
    const existing = current.find((l) => l.variantId === line.variantId);
    write(
      existing
        ? current.map((l) => (l.variantId === line.variantId ? { ...l, quantity: clamp(l.quantity + line.quantity) } : l))
        : [...current, { ...line, quantity: clamp(line.quantity) }]
    );
  },
  setQuantity(variantId: string, quantity: number) {
    write(read().map((l) => (l.variantId === variantId ? { ...l, quantity: clamp(quantity) } : l)).filter((l) => l.quantity > 0));
  },
  clear() {
    write([]);
  },
};
