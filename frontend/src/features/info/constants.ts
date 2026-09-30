export interface FaqItem {
  q: string;
  a: string;
}

export interface FaqGroup {
  title: string;
  icon: string;
  items: FaqItem[];
}

/** SSS içeriği; yanıtlar platformun gerçek işleyişini (escrow, itiraz, ödeme) anlatır */
export const FAQ_GROUPS: FaqGroup[] = [
  {
    title: 'Alışveriş ve Teslimat',
    icon: 'shopping_bag',
    items: [
      {
        q: 'Satın aldığım kodu nereden görürüm?',
        a: 'Anında teslimatlı ürünlerde kod, ödeme tamamlandığı anda "Hesabım > Dijital Kodlarım" sayfasına eklenir. Satıcı teslimatlı ürünlerde satıcının ilettiği bilgiler sipariş detayında "Satıcının teslimat notu" olarak görünür.',
      },
      {
        q: 'Anında teslimat ile satıcı teslimatı arasındaki fark nedir?',
        a: 'Anında teslimatta kodlar önceden sisteme yüklenmiştir ve otomatik verilir. Satıcı teslimatında (hesap, özel kod vb.) satıcı ilanda belirttiği süre içinde teslim eder; süre dolarsa siparişi iptal edip ödemenizi cüzdanınıza iade alabilirsiniz.',
      },
      {
        q: 'Escrow (güvenli havuz) nedir?',
        a: 'Ödediğiniz tutar satıcıya hemen geçmez; siz teslimatı onaylayana kadar NexusPin güvenli havuzunda tutulur. Onay vermezseniz, teslimattan belirli bir süre sonra (varsayılan 48 saat) ödeme otomatik olarak satıcıya aktarılır. Sorun varsa bu süre içinde itiraz açmalısınız.',
      },
      {
        q: 'Kod çalışmazsa ne yapmalıyım?',
        a: 'Sipariş detayında "Sorun Bildir" ile itiraz açın ve mümkünse kodu kullanmaya çalıştığınız ekranın video kaydını ekleyin. Satıcı iade yapabilir veya yeni kod gönderebilir; uzlaşma olmazsa hakem ekibimiz inceleyip karar verir. İtiraz süresince ödeme havuzda kalır.',
      },
    ],
  },
  {
    title: 'Ödeme ve Cüzdan',
    icon: 'account_balance_wallet',
    items: [
      {
        q: 'Nasıl ödeme yapabilirim?',
        a: 'Alışverişler NexusPin cüzdan bakiyesiyle yapılır. Bakiyenizi "Cüzdanım > Bakiye Yükle" sayfasından kredi/banka kartı, kripto para veya havale/EFT ile yükleyebilirsiniz. Kullanılabilir yöntemler ve varsa hizmet bedeli ödeme ekranında gösterilir.',
      },
      {
        q: 'Kart bilgilerim saklanıyor mu?',
        a: 'Hayır. Kartla ödemeler lisanslı ödeme kuruluşlarının güvenli sayfalarında (3D Secure) yapılır; kart bilgileriniz NexusPin sunucularına ulaşmaz ve saklanmaz.',
      },
      {
        q: 'Havale/EFT ve kripto yüklemeleri ne kadar sürer?',
        a: 'Havale/EFT\'de size verilen referans kodunu açıklamaya yazmanız gerekir; transfer doğrulanınca bakiyeniz yüklenir (mesai saatlerinde genellikle 30 dakika). Kripto adres yönteminde gönderimden sonra işlem özetini (TX hash) bildirirsiniz; ağ onayı ve kontrolün ardından TL karşılığı yüklenir.',
      },
      {
        q: 'İade edilen ödemeler nereye gider?',
        a: 'İptal edilen veya itiraz sonucu iade edilen siparişlerin tutarı cüzdan bakiyenize geri yüklenir ve hesap hareketlerinizde görünür.',
      },
    ],
  },
  {
    title: 'Satıcılar',
    icon: 'storefront',
    items: [
      {
        q: 'Nasıl satıcı olurum?',
        a: '"Hesabım > Satıcı Başvurusu" sayfasından başvurun. Onaylandıktan sonra mağazanızı oluşturup ilan açabilirsiniz; her ilan yayına girmeden önce ekibimizce incelenir.',
      },
      {
        q: 'Satış gelirimi ne zaman alırım?',
        a: 'Alıcı teslimatı onayladığında (veya onay süresi dolduğunda) satış tutarı, platform komisyonu düşülerek cüzdanınıza aktarılır. Komisyon oranı kategoriye göre değişebilir ve satış detayında gösterilir.',
      },
      {
        q: 'Kazancımı banka hesabıma nasıl çekerim?',
        a: '"Cüzdanım > Para Çek" sayfasından adınıza kayıtlı TR IBAN ile talep oluşturun. Tutar talep anında bakiyenizden ayrılır ve finans ekibimiz transferi yaptığında talep "Ödendi" olur. Para çekebilmek için e-posta adresinizin doğrulanmış olması gerekir.',
      },
      {
        q: 'İlanımı geçici olarak kapatabilir miyim?',
        a: 'Evet. "Pazar İlanlarım" sayfasındaki "Yayından Kaldır" butonuyla ilanınızı tek tuşla gizleyebilir, istediğiniz zaman yeniden yayına alabilirsiniz; stok ve kodlarınız korunur.',
      },
    ],
  },
  {
    title: 'Hesap ve Güvenlik',
    icon: 'shield_lock',
    items: [
      {
        q: 'İki adımlı doğrulamayı (2FA) nasıl açarım?',
        a: '"Hesap Ayarları" sayfasındaki İki Adımlı Doğrulama bölümünden Google Authenticator, Microsoft Authenticator veya Authy gibi bir uygulamayla QR kodu okutup açabilirsiniz. Size verilen kurtarma kodlarını güvenli bir yere kaydedin.',
      },
      {
        q: 'Şüpheli bir ilan veya mağaza gördüm, ne yapmalıyım?',
        a: 'İlan, mağaza veya yorum sayfasındaki "Şikâyet Et" butonunu kullanın. Ekibimiz şikâyeti inceler ve gerekirse içeriği kaldırır; sonuç size bildirim olarak iletilir.',
      },
      {
        q: 'NexusPin benden şifre veya kod ister mi?',
        a: 'Hayır. Ekibimiz sizden asla şifrenizi, doğrulama kodunuzu veya satın aldığınız kodları istemez. Bu tür taleplerle karşılaşırsanız destek ekibimize bildirin.',
      },
    ],
  },
];
