import type { AuthUser } from '@/features/auth/types';

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: string;
  /** Aktiflik kontrolünde yalnızca tam eşleşme */
  exact?: boolean;
}

/** Hesabım menüsü; kullanıcının rol ve yetkilerine göre oluşturulur */
export function accountNav(user: AuthUser | null): NavItem[] {
  if (!user) return [];
  const isSeller = user.canSell || user.role === 'ADMIN';

  if (user.role === 'DESTEK') {
    return [
      { label: 'Destek Masası', href: '/panel/destek', icon: 'headset_mic', badge: 'CANLI' },
      { label: 'Hakem & İtiraz Paneli', href: '/panel/itirazlar', icon: 'balance' },
      { label: 'İlan Onayları', href: '/panel/urunler', icon: 'fact_check' },
      { label: 'Siparişler', href: '/panel/siparisler', icon: 'receipt_long' },
      { label: 'Şikâyetler', href: '/panel/sikayetler', icon: 'flag' },
      { label: 'Yorum Denetimi', href: '/panel/yorumlar', icon: 'reviews' },
      { label: 'Mesajlarım', href: '/hesabim/mesajlar', icon: 'chat' },
      { label: 'Bildirimlerim', href: '/hesabim/bildirimler', icon: 'notifications' },
      { label: 'Hesap Ayarları', href: '/hesabim/ayarlar', icon: 'manage_accounts' },
    ];
  }

  return [
    { label: 'Genel Bakış', href: '/hesabim', icon: 'dashboard', exact: true },
    { label: 'Siparişlerim', href: '/hesabim/siparislerim', icon: 'receipt_long' },
    { label: 'Dijital Kodlarım', href: '/hesabim/kodlarim', icon: 'vpn_key' },
    { label: 'Cüzdanım', href: '/hesabim/cuzdan', icon: 'account_balance_wallet' },
    { label: 'Mesajlarım', href: '/hesabim/mesajlar', icon: 'chat' },
    { label: 'Bildirimlerim', href: '/hesabim/bildirimler', icon: 'notifications' },
    ...(isSeller
      ? [
          { label: 'Mağazam', href: '/hesabim/magazam/olustur', icon: 'store', badge: 'SATICI' },
          { label: 'Pazar İlanlarım', href: '/hesabim/pazar', icon: 'storefront', exact: true },
          { label: 'Satışlarım', href: '/hesabim/pazar/satislar', icon: 'local_shipping' },
          { label: 'Gelen İtirazlar', href: '/hesabim/pazar/itirazlar', icon: 'gavel' },
        ]
      : []),
    { label: 'Destek Talepleri', href: '/hesabim/destek', icon: 'support_agent' },
    { label: 'Hesap Ayarları', href: '/hesabim/ayarlar', icon: 'manage_accounts' },
    ...(user.role === 'ADMIN' ? [{ label: 'Yönetim Paneli', href: '/panel', icon: 'admin_panel_settings', badge: 'ADMIN' }] : []),
  ];
}

/** Yönetim paneli menüsü (erişim her sayfada backend'de ayrıca kontrol edilir) */
export function panelNav(user: AuthUser | null): NavItem[] {
  if (!user) return [];
  const isAdmin = user.role === 'ADMIN';
  return [
    ...(isAdmin ? [{ label: 'Genel Bakış', href: '/panel', icon: 'space_dashboard', exact: true }] : []),
    { label: 'Destek Masası', href: '/panel/destek', icon: 'headset_mic' },
    { label: 'İtiraz & Hakem', href: '/panel/itirazlar', icon: 'balance' },
    { label: 'İlan Onayları', href: '/panel/urunler', icon: 'fact_check' },
    { label: 'Siparişler', href: '/panel/siparisler', icon: 'receipt_long' },
    { label: 'Şikâyetler', href: '/panel/sikayetler', icon: 'flag' },
    { label: 'Yorum Denetimi', href: '/panel/yorumlar', icon: 'reviews' },
    ...(isAdmin
      ? [
          { label: 'Finans', href: '/panel/finans', icon: 'account_balance' },
          { label: 'Ödeme Yöntemleri', href: '/panel/odeme-yontemleri', icon: 'credit_card' },
          { label: 'Bildirim Gönder', href: '/panel/bildirim-gonder', icon: 'campaign' },
          { label: 'Kullanıcılar', href: '/panel/kullanicilar', icon: 'group' },
          { label: 'Mağazalar', href: '/panel/magazalar', icon: 'storefront' },
          { label: 'Kategoriler', href: '/panel/kategoriler', icon: 'category' },
          { label: 'Rol & İzinler', href: '/panel/izinler', icon: 'admin_panel_settings' },
          { label: 'İşlem Geçmişi', href: '/panel/islem-gecmisi', icon: 'history' },
          { label: 'Sistem Ayarları', href: '/panel/ayarlar', icon: 'settings' },
        ]
      : []),
  ];
}

export const isNavActive = (pathname: string, item: NavItem) =>
  item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
