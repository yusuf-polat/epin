export const auditKeys = {
  list: (params: object) => ['audit', params] as const,
};

/** Filtrede gösterilen işlem grupları (action öneki) */
export const AUDIT_ACTION_GROUPS: [string, string][] = [
  ['user.', 'Kullanıcı'],
  ['wallet.', 'Bakiye'],
  ['deposit.', 'Bakiye yükleme'],
  ['withdrawal.', 'Para çekme'],
  ['payment_gateway.', 'Ödeme yöntemi'],
  ['product.', 'İlan'],
  ['review.', 'Yorum'],
  ['complaint.', 'Şikâyet'],
  ['dispute.', 'İtiraz'],
  ['store.', 'Mağaza'],
  ['category.', 'Kategori'],
  ['permission.', 'Rol izinleri'],
  ['seller_request.', 'Satıcı başvurusu'],
  ['support.', 'Destek'],
  ['settings.', 'Sistem ayarları'],
  ['notification.', 'Toplu bildirim'],
];

/** Hedef türüne göre ilgili yönetim sayfası */
export const TARGET_LINKS: Record<string, string> = {
  USER: '/panel/kullanicilar',
  DEPOSIT: '/panel/finans',
  WITHDRAWAL: '/panel/finans',
  PAYMENT_GATEWAY: '/panel/odeme-yontemleri',
  PRODUCT: '/panel/urunler',
  COMPLAINT: '/panel/sikayetler',
  REVIEW: '/panel/yorumlar',
  DISPUTE: '/panel/itirazlar',
  STORE: '/panel/magazalar',
  CATEGORY: '/panel/kategoriler',
  ROLE: '/panel/izinler',
  TICKET: '/panel/destek',
  SETTINGS: '/panel/ayarlar',
  NOTIFICATION: '/panel/bildirim-gonder',
};

/** Metadata anahtarlarının okunur karşılıkları */
export const METADATA_LABELS: Record<string, string> = {
  action: 'Karar',
  amount: 'Tutar',
  approvedAmount: 'Onaylanan tutar',
  note: 'Not',
  reason: 'Gerekçe',
  role: 'Rol',
  canSell: 'Satıcı yetkisi',
  transferRef: 'Transfer ref.',
  status: 'Durum',
  resolution: 'Karar',
  isEnabled: 'Açık',
  testMode: 'Test modu',
  feePercent: 'Bedel %',
  feeFixed: 'Sabit bedel',
  minAmount: 'En az',
  maxAmount: 'En fazla',
  name: 'Ad',
  commissionRate: 'Komisyon %',
  permissions: 'İzinler',
  defaultSalePercent: 'Satış komisyonu %',
  withdrawalPercent: 'Çekim komisyonu %',
  withdrawalFixed: 'Çekim sabit ücreti',
  host: 'SMTP sunucusu',
  port: 'Port',
  enabled: 'Etkin',
  audience: 'Kitle',
  email: 'E-posta',
  title: 'Başlık',
  sendEmail: 'E-posta gönderimi',
};
