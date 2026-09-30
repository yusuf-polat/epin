import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/modules/uploads/upload.storage', () => ({
  fileStorage: { save: vi.fn(async (_buf: Buffer, ext: string) => ({ url: `http://x/uploads/f.${ext}`, relativeUrl: `/uploads/f.${ext}`, filename: `f.${ext}` })) },
}));

import { uploadService } from '@/modules/uploads/upload.service';
import { fileStorage } from '@/modules/uploads/upload.storage';
import { AppError } from '@/utils/errors';

const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const dataUrl = (mime: string, buf: Buffer) => `data:${mime};base64,${buf.toString('base64')}`;

beforeEach(() => vi.clearAllMocks());

describe('uploadService.saveImage', () => {
  it('gerçek PNG içeriğini kabul eder ve uzantıyı içerikten belirler', async () => {
    // MIME başlığı jpeg dese de içerik PNG olduğu için png olarak kaydedilir
    const res = await uploadService.saveImage(dataUrl('image/jpeg', PNG_HEADER));
    expect(fileStorage.save).toHaveBeenCalledWith(expect.any(Buffer), 'png');
    expect(res.url).toContain('.png');
  });

  it('görsel gibi gösterilen başka içeriği reddeder', async () => {
    const html = Buffer.from('<script>alert(1)</script>');
    await expect(uploadService.saveImage(dataUrl('image/png', html))).rejects.toMatchObject({ code: 'UNSUPPORTED_IMAGE' });
    expect(fileStorage.save).not.toHaveBeenCalled();
  });

  it('bozuk veriyi reddeder', async () => {
    await expect(uploadService.saveImage('merhaba')).rejects.toBeInstanceOf(AppError);
  });

  it('zaten yüklenmiş adresleri olduğu gibi döndürür', async () => {
    expect(await uploadService.saveImage('/uploads/a.png')).toMatchObject({ url: '/uploads/a.png' });
    expect(fileStorage.save).not.toHaveBeenCalled();
  });
});
