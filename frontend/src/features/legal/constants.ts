import { siteConfig } from '@/config/site';

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalDocument {
  slug: string;
  title: string;
  /** Kısa ad (footer, onay kutuları) */
  shortTitle: string;
  updatedAt: string;
  sections: LegalSection[];
}

const c = siteConfig.company;
const UPDATED_AT = '30.09.2026';

/**
 * Yasal metin şablonları. Hukuki danışmanlık yerine geçmez; yayına almadan önce
 * bir hukukçu tarafından şirketin gerçek bilgileri ve süreçleriyle gözden geçirilmelidir.
 */
export const LEGAL_DOCUMENTS: LegalDocument[] = [
  {
    slug: 'kullanim-kosullari',
    title: 'Kullanım Koşulları ve Üyelik Sözleşmesi',
    shortTitle: 'Kullanım Koşulları',
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: '1. Taraflar ve Konu',
        paragraphs: [
          `Bu sözleşme, ${c.legalName} ("${siteConfig.name}") ile platforma üye olan kullanıcı arasında, platformun kullanım şartlarını düzenler.`,
          `${siteConfig.name}, dijital kod ve e-pin alıcılarını satıcılarla buluşturan bir aracı hizmet sağlayıcıdır. Platform ürünleri dışında kalan ilanlarda satıcı, ilanı veren üyedir.`,
        ],
      },
      {
        heading: '2. Üyelik',
        paragraphs: [
          'Üye, 18 yaşını doldurmuş olduğunu ve kayıt sırasında verdiği bilgilerin doğru olduğunu beyan eder. Hesap güvenliğinden (şifrenin gizliliği dahil) üye sorumludur.',
          'Başkası adına hesap açmak, birden fazla hesapla kötüye kullanım, dolandırıcılık veya kara para aklama şüphesi taşıyan işlemler yasaktır; bu durumlarda hesap askıya alınabilir.',
        ],
      },
      {
        heading: '3. Güvenli Ödeme (Escrow)',
        paragraphs: [
          'Alıcının ödediği tutar, teslimat alıcı tarafından onaylanana veya onay süresi dolana kadar platform tarafından güvenli havuzda tutulur.',
          'Sorunlu teslimatlarda alıcı, video kanıtıyla itiraz açabilir. Satıcı yanıt vermezse itiraz destek ekibine aktarılır ve hakem kararı taraflar için bağlayıcıdır.',
        ],
      },
      {
        heading: '4. Satıcı Yükümlülükleri ve Komisyon',
        paragraphs: [
          'Satıcı, sattığı kodların yasal yollarla edinildiğini, kullanılmamış ve geçerli olduğunu taahhüt eder. Çalıntı, sahte veya lisans ihlali içeren ürünlerin satışı yasaktır.',
          'Her satıştan, satış anında ilgili kategori için ilan edilen oranda platform komisyonu kesilir. Satış geliri, komisyon düşüldükten sonra satıcının cüzdan bakiyesine aktarılır.',
          'Satıcı, bakiyesini yalnızca kendi adına kayıtlı banka hesabına çekebilir. Para çekme talepleri güvenlik kontrollerinden sonra işleme alınır.',
        ],
      },
      {
        heading: '5. Cüzdan Bakiyesi',
        paragraphs: [
          'Cüzdan bakiyesi yalnızca platform içi alışverişlerde kullanılabilir; faiz işletilmez. Havale/EFT ile yapılan yüklemeler, gönderen hesap sahibi ile üye bilgilerinin eşleşmesi halinde onaylanır.',
        ],
      },
      {
        heading: '6. Sorumluluğun Sınırlandırılması',
        paragraphs: [
          `${siteConfig.name}, üyeler arasındaki satışlarda aracı hizmet sağlayıcı olup ürünün üreticisi değildir. Platform, escrow ve itiraz süreçleriyle alıcıyı korumayı amaçlar.`,
        ],
      },
      {
        heading: '7. Uyuşmazlıklar',
        paragraphs: [
          'Bu sözleşmeden doğan uyuşmazlıklarda Türkiye Cumhuriyeti hukuku uygulanır. Tüketici işlemlerinde ilgili Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir.',
          `İletişim: ${c.email} · ${c.address}`,
        ],
      },
    ],
  },
  {
    slug: 'kvkk-aydinlatma-metni',
    title: 'KVKK Aydınlatma Metni',
    shortTitle: 'KVKK Aydınlatma Metni',
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: '1. Veri Sorumlusu',
        paragraphs: [
          `6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca kişisel verileriniz, veri sorumlusu sıfatıyla ${c.legalName} (MERSİS: ${c.mersisNo}, Adres: ${c.address}) tarafından işlenmektedir.`,
        ],
      },
      {
        heading: '2. İşlenen Kişisel Veriler',
        paragraphs: [
          'Kimlik ve iletişim (ad soyad, e-posta, telefon), müşteri işlem (sipariş, cüzdan hareketleri, itiraz ve destek kayıtları), finans (IBAN ve hesap sahibi adı — yalnızca para çekme/yükleme işlemlerinde), işlem güvenliği (IP adresi, oturum ve log kayıtları) ile itirazlarda paylaştığınız video bağlantıları.',
        ],
      },
      {
        heading: '3. İşleme Amaçları ve Hukuki Sebepler',
        paragraphs: [
          'Üyelik ve satış sözleşmesinin kurulması ve ifası (KVKK m.5/2-c), hukuki yükümlülüklerin yerine getirilmesi (m.5/2-ç; ör. vergi ve 5549 sayılı Kanun kapsamındaki yükümlülükler), dolandırıcılığın önlenmesi ve işlem güvenliği için meşru menfaat (m.5/2-f).',
        ],
      },
      {
        heading: '4. Aktarım',
        paragraphs: [
          'Verileriniz; ödemelerin yapılabilmesi için bankalara, yasal talepler halinde yetkili kamu kurumlarına ve hizmet aldığımız barındırma/e-posta sağlayıcılarına, amaçla sınırlı olarak aktarılabilir. Satın alma yaptığınız satıcıyla yalnızca siparişin ifası için gerekli bilgiler (ad) paylaşılır.',
        ],
      },
      {
        heading: '5. Haklarınız',
        paragraphs: [
          `KVKK m.11 kapsamındaki haklarınızı (bilgi talep etme, düzeltme, silme, itiraz vb.) ${c.kvkkEmail} adresine yazılı olarak iletebilirsiniz. Başvurular en geç 30 gün içinde sonuçlandırılır.`,
        ],
      },
    ],
  },
  {
    slug: 'mesafeli-satis-sozlesmesi',
    title: 'Mesafeli Satış Sözleşmesi ve Ön Bilgilendirme Formu',
    shortTitle: 'Mesafeli Satış Sözleşmesi',
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: '1. Taraflar',
        paragraphs: [
          `Aracı hizmet sağlayıcı: ${c.legalName}, ${c.address}, ${c.taxOffice}, e-posta: ${c.email}.`,
          'Satıcı: Ürün sayfasında ve sipariş detayında mağaza adı belirtilen üye satıcı; platform ürünlerinde aracı hizmet sağlayıcının kendisi. Alıcı: Siparişi veren üye.',
        ],
      },
      {
        heading: '2. Konu ve Ürün Bilgileri',
        paragraphs: [
          'Sözleşmenin konusu, alıcının elektronik ortamda sipariş verdiği dijital içeriğin (oyun kodu, e-pin, hediye kartı vb.) satışıdır. Ürünün temel nitelikleri, bölge kısıtları, vergiler dahil toplam fiyatı ve teslimat yöntemi ürün sayfasında ve ödeme ekranında gösterilir.',
        ],
      },
      {
        heading: '3. Ödeme ve Teslimat',
        paragraphs: [
          'Ödeme, alıcının cüzdan bakiyesinden tahsil edilir. Anında teslimatlı ürünlerde kod ödeme anında "Dijital Kodlarım" sayfasında teslim edilir; satıcı teslimatlı ürünlerde teslim, ürün sayfasında belirtilen süre içinde yapılır.',
          'Satıcı teslimatlı siparişler süresi içinde teslim edilmezse ödeme otomatik olarak alıcının bakiyesine iade edilir.',
        ],
      },
      {
        heading: '4. Cayma Hakkı',
        paragraphs: [
          'Mesafeli Sözleşmeler Yönetmeliği m.15/1-ğ uyarınca, elektronik ortamda anında ifa edilen hizmetler ve tüketiciye anında teslim edilen gayrimaddi mallar ile m.15/1-ç kapsamındaki ürünlerde cayma hakkı kullanılamaz. Alıcı, siparişi onaylayarak dijital içeriğin ifasına başlanmasına onay verdiğini ve bu nedenle cayma hakkını kaybedeceğini kabul eder.',
          'Kodun geçersiz, kullanılmış veya ürün açıklamasına aykırı olması halinde alıcının ayıplı ifa nedeniyle itiraz ve iade hakları saklıdır (bkz. İade Politikası).',
        ],
      },
      {
        heading: '5. Uyuşmazlık',
        paragraphs: [
          'Şikâyet ve itirazlar için alıcı, ilgili mevzuatta belirlenen parasal sınırlar dahilinde yerleşim yerindeki Tüketici Hakem Heyetine veya Tüketici Mahkemesine başvurabilir.',
        ],
      },
    ],
  },
  {
    slug: 'iade-politikasi',
    title: 'İade ve İtiraz Politikası',
    shortTitle: 'İade Politikası',
    updatedAt: UPDATED_AT,
    sections: [
      {
        heading: 'Hangi durumlarda iade alabilirim?',
        paragraphs: [
          'Teslim edilen kod geçersizse, daha önce kullanılmışsa veya sipariş ettiğiniz üründen farklıysa, sipariş onay süresi dolmadan "Siparişlerim" sayfasından itiraz açabilirsiniz.',
          'Satıcı teslimatlı siparişler süresi içinde teslim edilmezse ödemeniz otomatik olarak cüzdanınıza iade edilir.',
        ],
      },
      {
        heading: 'İtiraz süreci',
        paragraphs: [
          'İtirazınızı, kodun kullanım denemesini gösteren bir video bağlantısıyla (YouTube) açarsınız. Satıcı kodu değiştirebilir veya iade yapabilir; 48 saat içinde yanıt vermezse itiraz destek ekibimize aktarılır.',
          'İtiraz süresince ödeme satıcıya aktarılmaz. Hakem kararıyla iade edilen tutar cüzdan bakiyenize yüklenir.',
        ],
      },
      {
        heading: 'İade edilmeyen durumlar',
        paragraphs: [
          'Kodu başarıyla kullandıktan sonra, yanlış bölge/platform seçimi gibi ürün açıklamasında belirtilmiş koşullara aykırı kullanımlarda veya siparişi onayladıktan sonra iade yapılmaz.',
        ],
      },
    ],
  },
];

export const LEGAL_LINKS = LEGAL_DOCUMENTS.map((d) => ({ href: `/sozlesmeler/${d.slug}`, label: d.shortTitle }));

export const legalHref = (slug: 'kullanim-kosullari' | 'kvkk-aydinlatma-metni' | 'mesafeli-satis-sozlesmesi' | 'iade-politikasi') => `/sozlesmeler/${slug}`;

export const findLegalDocument = (slug: string) => LEGAL_DOCUMENTS.find((d) => d.slug === slug);
