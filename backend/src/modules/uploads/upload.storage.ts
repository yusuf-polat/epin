import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { env } from '@/config/env';
import { StoredFile } from './upload.types';

/**
 * Depolama soyutlaması. Şu an Docker volume'üne yazılır; S3 / Cloudflare R2
 * gibi bir object storage'a geçişte yalnızca bu arayüzün yeni bir
 * implementasyonu eklenir.
 */
export interface FileStorage {
  save(buffer: Buffer, extension: string): Promise<StoredFile>;
}

export const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

class LocalDiskStorage implements FileStorage {
  async save(buffer: Buffer, extension: string): Promise<StoredFile> {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${extension}`;
    await fs.writeFile(path.join(UPLOADS_DIR, filename), buffer);
    const relativeUrl = `/uploads/${filename}`;
    return { url: `${env.APP_URL.replace(/\/$/, '')}${relativeUrl}`, relativeUrl, filename };
  }
}

export const fileStorage: FileStorage = new LocalDiskStorage();
