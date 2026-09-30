'use client';

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { cartApi } from '../services/cart.api';
import { guestCart } from '../services/guest-cart.storage';
import { cartKeys, MAX_ITEM_QUANTITY } from '../constants';
import { CartLine, CartLineSnapshot, ServerCart } from '../types';

const toLines = (cart: ServerCart): CartLine[] =>
  cart.items.map((i) => ({
    variantId: i.variantId,
    itemId: i.id,
    quantity: i.quantity,
    unitPrice: i.unitPrice,
    title: i.product.title,
    denomination: i.variant.denomination,
    imageUrl: i.product.imageUrl,
    slug: i.product.slug,
    deliveryType: i.product.deliveryType,
    storeName: i.product.store?.name ?? null,
    availableStock: i.availableStock,
    unavailableReason: i.unavailableReason,
  }));

/** Sunucu sepeti (oturum açıkken tek doğru kaynak) */
export function useServerCart(enabled: boolean) {
  return useQuery({ queryKey: cartKeys.all, queryFn: cartApi.get, enabled, select: toLines });
}

/**
 * Birleşik sepet: oturum açıkken sunucu sepeti, değilse tarayıcıdaki misafir sepeti.
 */
export function useCart() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const guestLines = useSyncExternalStore(guestCart.subscribe, guestCart.getSnapshot, guestCart.getServerSnapshot);
  const server = useServerCart(!!user);

  const setCart = (cart: ServerCart) => queryClient.setQueryData(cartKeys.all, cart);
  const addMutation = useMutation({ mutationFn: (l: CartLineSnapshot) => cartApi.add(l.variantId, l.quantity), onSuccess: setCart });
  const updateMutation = useMutation({ mutationFn: (v: { itemId: string; quantity: number }) => cartApi.update(v.itemId, v.quantity), onSuccess: setCart });

  const lines: CartLine[] = user ? server.data ?? [] : guestLines;

  const add = useCallback(
    async (line: CartLineSnapshot) => {
      if (user) await addMutation.mutateAsync(line);
      else guestCart.add(line);
    },
    [user, addMutation]
  );

  const setQuantity = useCallback(
    async (variantId: string, quantity: number) => {
      const clamped = Math.max(0, Math.min(quantity, MAX_ITEM_QUANTITY));
      if (!user) return guestCart.setQuantity(variantId, clamped);
      const line = lines.find((l) => l.variantId === variantId);
      if (line?.itemId) await updateMutation.mutateAsync({ itemId: line.itemId, quantity: clamped });
    },
    [user, lines, updateMutation]
  );

  const remove = useCallback((variantId: string) => setQuantity(variantId, 0), [setQuantity]);

  return useMemo(
    () => ({
      lines,
      count: lines.reduce((s, l) => s + l.quantity, 0),
      total: Math.round(lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0) * 100) / 100,
      isGuest: !user,
      isLoading: !!user && server.isLoading,
      add,
      setQuantity,
      remove,
    }),
    [lines, user, server.isLoading, add, setQuantity, remove]
  );
}

/** Giriş yapıldığında misafir sepetini hesaba aktarır (AppProviders içinde bir kez çalışır) */
export function useGuestCartMerge() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const merging = useRef(false);

  useEffect(() => {
    const lines = guestCart.getSnapshot();
    if (!user || lines.length === 0 || merging.current) return;
    merging.current = true;
    cartApi
      .merge(lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })))
      .then((cart) => {
        guestCart.clear();
        queryClient.setQueryData(cartKeys.all, cart);
      })
      .catch(() => undefined)
      .finally(() => {
        merging.current = false;
      });
  }, [user, queryClient]);
}
