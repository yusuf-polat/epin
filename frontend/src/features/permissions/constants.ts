export const permissionKeys = {
  all: ['permissions'] as const,
};

/** ADMIN her zaman tam yetkilidir; yalnızca bu roller düzenlenebilir */
export const EDITABLE_ROLES = ['DESTEK', 'USER'] as const;

export const PERMISSION_DEFINITIONS: { key: string; label: string; desc: string; category: string }[] = [
  { key: 'approve_listings', label: 'İlan Onay & Red', desc: 'Satıcı ilanlarını inceleme, onaylama veya reddetme.', category: 'Ürün & İlan' },
  { key: 'manage_products', label: 'Ürün Yönetimi', desc: 'Platform ürünü oluşturma ve tüm ilanlara kod/stok ekleme.', category: 'Ürün & İlan' },
  { key: 'manage_disputes', label: 'İtiraz Hakemliği', desc: 'Escrow itirazlarını inceleyip karara bağlama.', category: 'Destek & İtiraz' },
  { key: 'manage_stores', label: 'Mağaza Denetimi', desc: 'Satıcı mağazalarını askıya alma / aktifleştirme.', category: 'Mağaza' },
  { key: 'manage_categories', label: 'Kategori Yönetimi', desc: 'Kategori oluşturma, düzenleme ve silme.', category: 'Katalog' },
  { key: 'manage_users', label: 'Kullanıcı & Satıcı Yönetimi', desc: 'Kullanıcıları listeleme, satıcı başvurularını sonuçlandırma.', category: 'Kullanıcı' },
  { key: 'ban_user', label: 'Hesap Askıya Alma', desc: 'Kullanıcı hesaplarını askıya alma ve aktifleştirme.', category: 'Kullanıcı' },
  { key: 'manage_wallets', label: 'Bakiye Düzenleme', desc: 'Kullanıcı cüzdanlarına manuel bakiye ekleme/düşme.', category: 'Finans' },
  { key: 'manage_finance', label: 'Finans Operasyonları', desc: 'Havale/EFT yüklemelerini ve para çekme taleplerini onaylama, cüzdan defterini görüntüleme.', category: 'Finans' },
  { key: 'view_reports', label: 'Satış Raporları', desc: 'Panel ana sayfasında ciro, komisyon ve günlük satış raporlarını görme.', category: 'Finans' },
  { key: 'manage_orders', label: 'Sipariş Görüntüleme', desc: 'Tüm siparişleri listeleme ve sipariş detaylarını inceleme.', category: 'Destek & İtiraz' },
  { key: 'manage_payments', label: 'Ödeme Yöntemleri', desc: 'Stripe, PayTR, iyzico, kripto ve havale ayarlarını, API anahtarlarını ve hizmet bedellerini yönetme.', category: 'Finans' },
  { key: 'moderate_content', label: 'İçerik Denetimi', desc: 'Şikâyetleri sonuçlandırma, kurallara aykırı yorumları ve içerikleri kaldırma.', category: 'Destek & İtiraz' },
  { key: 'manage_roles', label: 'Rol & Yetki Yönetimi', desc: 'Kullanıcı rollerini ve bu izin matrisini değiştirme.', category: 'Sistem' },
  { key: 'manage_settings', label: 'Sistem Ayarları', desc: 'Varsayılan satış komisyonu, para çekme ücreti ve SMTP e-posta ayarlarını yönetme.', category: 'Sistem' },
  { key: 'broadcast_notifications', label: 'Toplu Bildirim', desc: 'Kullanıcılara toplu sistem bildirimi ve e-posta gönderme.', category: 'Sistem' },
  { key: 'view_audit_log', label: 'İşlem Geçmişi', desc: 'Yönetim ekibinin yaptığı tüm işlemlerin kaydını görüntüleme.', category: 'Sistem' },
];
