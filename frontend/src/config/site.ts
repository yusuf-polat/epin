export const siteConfig = {
  name: 'NexusPin',
  title: 'NexusPin | P2P E-Pin ve Dijital Ürün Pazar Yeri',
  description: 'Steam cüzdan kodları, Valorant VP, PUBG UC ve dijital hediye kartları. Escrow korumalı güvenli P2P alışveriş.',
  keywords: 'epin, steam cüzdan kodu, valorant vp, pubg uc, dijital oyun kodları, p2p pazar yeri',
  locale: 'tr-TR',
  currency: 'TRY',
  /** Herkese açık site adresi (sunucuda çalışma zamanında okunur) */
  get url(): string {
    return (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  },
  /**
   * Yasal metinlerde kullanılan satıcı/aracı hizmet sağlayıcı bilgileri.
   * Canlıya çıkmadan önce gerçek şirket bilgileriyle güncellenmelidir.
   */
  company: {
    legalName: 'NexusPin Bilişim Hizmetleri A.Ş.',
    address: 'Örnek Mah. Teknoloji Cad. No:1, Kadıköy / İstanbul',
    mersisNo: '0000000000000000',
    taxOffice: 'Kadıköy V.D. · 0000000000',
    email: 'destek@nexuspin.com',
    kvkkEmail: 'kvkk@nexuspin.com',
    phone: '+90 850 000 00 00',
    supportHours: 'Canlı destek her gün 09:00 - 24:00; destek talepleri 7/24',
  },
} as const;
