# NexusPin — P2P E-Pin & Dijital Ürün Pazar Yeri

Alıcıların dijital kod / e-pin satın aldığı, onaylı satıcıların mağaza açıp ilan verdiği, ödemelerin **escrow (güvenli havuz)** ile korunduğu P2P pazar yeri.

## Teknolojiler

| Katman   | Teknoloji                                                                 |
| -------- | ------------------------------------------------------------------------- |
| Backend  | Node.js 22, Express, TypeScript, Prisma (migrations), Zod, Redis, node-cron |
| Frontend | Next.js 14 (App Router, `src/` + route groups + `features/`), TanStack Query, React Hook Form + Zod, Tailwind |
| Veri     | PostgreSQL 16, Redis 7                                                    |
| Altyapı  | Docker Compose                                                            |

## Çalıştırma (yalnızca Docker)

```powershell
cp .env.example .env                  # ilk kurulum: değerleri düzenleyin (özellikle JWT_SECRET ve şifreler)
docker compose up --build -d          # tüm servisler
docker compose build backend; docker compose up -d backend
docker compose build frontend; docker compose up -d frontend
docker compose ps
docker logs nexuspin_backend --tail 50
```

- Frontend: http://localhost:3000
- API: http://localhost:5000/api (sağlık: `/api/health`)
- PostgreSQL: `localhost:5432` (Redis yalnızca iç ağda)

Backend container'ı açılışta sırasıyla: eski `db push` veritabanlarını migration geçmişine bağlar (baseline) → `prisma migrate deploy` → idempotent seed → API.

### Veritabanı

```powershell
docker compose exec backend npx prisma migrate deploy   # bekleyen migration'lar
docker compose exec backend npm run prisma:seed          # seed (mevcut kullanıcı/şifreleri ezmez)
```

Şema değişikliği için yeni migration üretilir (`prisma migrate diff` / `migrate dev`); **`prisma db push` kullanılmaz.**

Varsayılan yönetici hesapları yalnızca yoksa oluşturulur (`SEED_ADMIN_*`, `SEED_DESTEK_*` env değişkenleri; varsayılan `admin@nexuspin.com` / `Admin123!`). **Canlıya çıkmadan önce bu şifreleri `backend/.env` ile değiştirin veya ilk girişte panelden güncelleyin.**

## Önemli davranışlar

- **Oturum:** JWT, `HttpOnly` + `SameSite=Lax` cookie (`nexuspin_token`) ile taşınır; tarayıcıda token saklanmaz. Farklı alt alan adlarında (`example.com` / `api.example.com`) `COOKIE_DOMAIN=.example.com` ve HTTPS'te `COOKIE_SECURE=true` ayarlanmalıdır.
- **Ödeme:** Alışverişler **cüzdan bakiyesi** ile yapılır; her hareket `wallet_transactions` defterine kaydedilir. Bakiye yükleme yöntemleri aşağıda. `ENABLE_WALLET_TOPUP=true` yalnızca test ortamında doğrudan yüklemeyi açar.
- **Escrow akışı:** Sepet satıcı ve teslimat tipine göre ayrı siparişlere bölünür. Anında teslimatta kodlar hemen verilir; manuel teslimatta satıcı süre içinde teslim eder. Alıcı onaylar veya `ESCROW_AUTO_RELEASE_HOURS` dolarsa tutar satıcıya geçer. Süresinde teslim edilmeyen siparişler otomatik iade edilir; satıcının 48 saatte yanıtlamadığı itirazlar hakeme aktarılır.
- **Yetkiler:** `ADMIN` tam yetkilidir; `DESTEK` ve diğer roller panelden verilen izinlere (`/panel/izinler`) göre backend'de kontrol edilir.

## Ödeme yöntemleri (bakiye yükleme)

Yöntemler **Panel → Ödeme Yöntemleri** (`/panel/odeme-yontemleri`, izin: `manage_payments`) ekranından açılıp kapatılır; görünen ad, sıra, en az/en fazla tutar ve kullanıcıya yansıtılan hizmet bedeli (% + sabit) buradan ayarlanır.

| Yöntem | Tür | Doğrulama | Panelde tanımlanacak bildirim adresi |
| ------ | --- | --------- | ------------------------------------ |
| Havale / EFT | Yönetici onaylı | Referans kodu + Finans ekranından onay | — |
| Kripto (cüzdan adresi) | Yönetici onaylı | Kullanıcı TX hash bildirir, Finans ekranından onay | — |
| PayTR | Gömülü iFrame | `hash` (HMAC-SHA256) | `PUBLIC_API_URL/api/payments/webhooks/paytr` (Bildirim URL) |
| iyzico | Yönlendirmeli Checkout Form | Callback token'ı iyzico API'sinden sorgulanır | — (her ödemede isteğe eklenir) |
| Stripe | Yönlendirmeli Checkout | `Stripe-Signature` (HMAC-SHA256, 5 dk tolerans) | `PUBLIC_API_URL/api/payments/webhooks/stripe` |
| Kripto (NOWPayments) | Yönlendirmeli fatura | `x-nowpayments-sig` (HMAC-SHA512) | Her ödemede isteğe eklenir (IPN secret panelde tanımlanır) |

- **Anahtarlar** veritabanında AES-256-GCM ile şifreli saklanır, API yanıtlarında yalnızca maskeli (`••••1234`) döner ve işlem geçmişine yazılmaz. Şifreleme anahtarı `DATA_ENCRYPTION_KEY` (boşsa `JWT_SECRET`'tan türetilir); **bu değerler değişirse kayıtlı anahtarlar çözülemez ve panelden yeniden girilmelidir.** Canlı ortamda en az 32 karakterlik ayrı bir `DATA_ENCRYPTION_KEY` tanımlayın.
- **Bildirim adresleri** `PUBLIC_API_URL` (boşsa `APP_URL`) ile oluşturulur ve panelde kopyalanabilir gösterilir. Sağlayıcıların ulaşabilmesi için adres internetten erişilebilir (HTTPS) olmalıdır; yerel geliştirmede Stripe ve iyzico ödemeleri sonuç sayfası açıldığında sağlayıcıdan sorgulanır.
- **Güvenlik:** Sağlayıcının bildirdiği tutar ve para birimi, tahsil edilmesi gerekenle kuruşu kuruşuna eşleşmezse bakiye yüklenmez ve finans ekibi bilgilendirilir. Aynı bildirim tekrar gelse de bakiye bir kez yüklenir. Tamamlanmayan kart ödemeleri 2 saat, kripto ödemeleri 24 saat sonra zaman aşımına düşer; sonradan gelen başarılı bildirim yine işlenir.
- **Test modu:** Açıkken PayTR `test_mode=1`, iyzico ve NOWPayments sandbox adresleri kullanılır; Stripe'ta `sk_test_...` anahtarı giriniz.
- Online ödemeler **Finans → Online Ödemeler** sekmesinde izlenir; Stripe/iyzico ödemeleri buradan sağlayıcıya yeniden sorgulanabilir.

## Hesap güvenliği ve denetim

- **E-posta doğrulama:** Yeni kayıtlara doğrulama bağlantısı gönderilir (`EMAIL_VERIFICATION_TTL_HOURS`, varsayılan 48). Para çekmek için doğrulanmış e-posta gerekir. SMTP tanımlı değilse bağlantı geliştirme ortamında log'a yazılır.
- **İki adımlı doğrulama (TOTP):** Hesap Ayarları'ndan açılır; Google/Microsoft Authenticator, Authy vb. ile uyumludur. 10 tek kullanımlık kurtarma kodu verilir. Aynı kod iki kez kullanılamaz.
- **Şikâyetler** (`/panel/sikayetler`) ve **yorum denetimi** (`/panel/yorumlar`): `moderate_content` izni. Haklı bulunan şikâyette ilan yayından kaldırılır, mağaza askıya alınır veya yorum silinir.
- **İşlem geçmişi** (`/panel/islem-gecmisi`, izin: `view_audit_log`): bakiye düzenleme, yasaklama, onay/red, ödeme ayarı değişikliği gibi tüm yönetim işlemleri kim/ne zaman/gerekçe bilgisiyle kaydedilir.

## Sistem ayarları ve bildirimler

- **Sistem Ayarları** (`/panel/ayarlar`, izin: `manage_settings`):
  - Varsayılan satış komisyonu (kategoride özel oran yoksa), para çekme komisyonu (% + sabit ₺).
  - SMTP sunucusu. Panel ayarı kapalıysa `.env` `SMTP_*` değerleri kullanılır; şifre şifreli saklanır. Gmail, Outlook, Yandex, Brevo ve SendGrid için hazır ayarlar ve test e-postası vardır.
  - Oranlar yalnızca yeni sipariş ve çekim taleplerine uygulanır. Çekim ücreti talebe yazılır; finans ekibi `netAmount`'u gönderir, red/iptalde tutarın tamamı iade edilir.
- **Bildirim Gönder** (`/panel/bildirim-gonder`, izin: `broadcast_notifications`): tüm kullanıcılar, satıcılar, alıcılar, yönetim ekibi veya tek kullanıcıya sistem bildirimi; isteğe bağlı e-posta (arka planda). Gönderim geçmişi tutulur, bağlantılar yalnızca site içi olabilir.
- **Bölge:** İlanlarda sabit bölge kodları seçilir (`GLOBAL`, `TR`, `EU`, `EMEA`, `UK`, `US`, `LATAM`, `ASIA`, `RU_CIS`). Katalogda bölge filtresi o bölgenin ve Global ilanların tamamını gösterir; bölgeye kilitli ürünlerde satın alma öncesi uyarı çıkar.

## SEO

`/sitemap.xml` (ürünler, mağazalar, kategoriler, bilgi sayfaları; saatlik yenilenir) ve `/robots.txt` dinamik üretilir. Adresler frontend'in `SITE_URL` değişkeninden alınır (canlıda gerçek alan adını tanımlayın).

## Frontend veri & form katmanı

- **Sunucu durumu:** TanStack Query. Her feature'ın `hooks/` klasörü query/mutation hook'larını, `constants.ts` query-key fabrikasını (`orderKeys`, `productKeys`...) içerir. Bileşenler servisleri (`services/*.api.ts`) doğrudan çağırmaz; mutation'lar ilgili anahtarları (sipariş, cüzdan, oturum...) invalidate eder.
- **Oturum:** `['auth','me']` sorgusu; ilk değer sunucuda `getSessionUser()` ile alınıp `AppProviders` içinde tohumlanır (`useAuth`).
- **Misafir sepeti:** `localStorage` + `useSyncExternalStore`; girişte sunucu sepetine birleştirilir.
- **Formlar:** React Hook Form + `zodResolver`; şemalar `features/*/schemas/`, ortak parçalar `lib/validations/common.ts`, ortak alan bileşenleri `components/ui/FormField.tsx`. Backend her isteği yeniden doğrular.

## Testler

```powershell
# Backend unit (Vitest) + integration (Supertest, ayrı nexuspin_test veritabanı)
docker compose --profile test run --rm backend-test

# Frontend typecheck + bileşen/birim testleri (Vitest, Testing Library, jsdom)
docker compose --profile test run --rm frontend-test

# Backend uçtan uca P2P akışı (race condition, escrow, itiraz, yetki, CSRF)
docker run --rm -v "${PWD}/backend/tests:/tests" -e API=http://host.docker.internal:5000/api node:22-alpine sh -c "apk add -q curl bash && bash /tests/e2e/p2p-flow.sh"

# Frontend SSR / oturum koruması smoke testi
docker run --rm -v "${PWD}/frontend/tests:/tests" -e WEB=http://host.docker.internal:3000 -e API=http://host.docker.internal:5000/api node:22-alpine sh -c "apk add -q curl bash && bash /tests/e2e/smoke.sh"
```

## Lisans

[MIT](./LICENSE)
