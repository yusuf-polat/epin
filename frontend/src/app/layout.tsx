import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import '@/styles/globals.css';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';
import Footer from '@/components/layout/Footer';
import { AppProviders } from '@/components/providers/AppProviders';
import { getSessionUser } from '@/features/auth/server';
import { siteConfig } from '@/config/site';

const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter', display: 'swap' });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin', 'latin-ext'], variable: '--font-plus-jakarta', display: 'swap' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin', 'latin-ext'], variable: '--font-jetbrains-mono', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: siteConfig.title,
  description: siteConfig.description,
  keywords: siteConfig.keywords,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Oturum HttpOnly cookie ile sunucuda çözülür; istemciye yalnızca kullanıcı bilgisi aktarılır
  const user = await getSessionUser();

  return (
    <html lang="tr" className={`${inter.variable} ${plusJakarta.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen flex flex-col bg-[#090a0f] text-[#f1f5f9] antialiased selection:bg-[#2563eb] selection:text-white">
        <AppProviders initialUser={user}>
          <Header />
          <main className="flex-1 pt-20 pb-16 xl:pb-0">{children}</main>
          <Footer />
          <BottomNav />
        </AppProviders>
      </body>
    </html>
  );
}
