/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  poweredByHeader: false,
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  async redirects() {
    return [
      // Eski adresler
      { source: '/panel/kodlarim', destination: '/hesabim/kodlarim', permanent: true },
      { source: '/hesabim/destek/itirazlar', destination: '/panel/itirazlar', permanent: true },
      { source: '/hesabim/bakiye', destination: '/hesabim/cuzdan', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Başka siteler çerçeveleyemez; PayTR gömülü formu ödeme sonrası kendi dönüş sayfamızı açabilir
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
