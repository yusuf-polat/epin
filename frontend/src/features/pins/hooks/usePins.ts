'use client';

import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { pinApi } from '../services/pin.api';
import { pinKeys } from '../constants';

export const useMyPins = (page: number) =>
  useQuery({ queryKey: pinKeys.mine(page), queryFn: () => pinApi.listMine(page), placeholderData: keepPreviousData });

/** Kod yalnızca istek anında açılır; önbelleğe yazılmaz */
export const useRevealPin = () => useMutation({ mutationFn: (id: string) => pinApi.reveal(id) });
