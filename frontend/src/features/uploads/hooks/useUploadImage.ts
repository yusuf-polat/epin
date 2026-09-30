'use client';

import { useMutation } from '@tanstack/react-query';
import { uploadApi } from '../services/upload.api';

/** Görseli doğrulayıp yükler, genel URL döner */
export const useUploadImage = () => useMutation({ mutationFn: (file: File) => uploadApi.image(file) });
