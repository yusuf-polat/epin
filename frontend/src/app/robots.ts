import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Hesap, yönetim ve oturum sayfaları dizine eklenmez
        disallow: ['/hesabim', '/panel', '/auth', '/sepet'],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
