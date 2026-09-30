#!/usr/bin/env bash
# P2P e-pin akışının uçtan uca smoke testi.
# Kullanım: API=http://localhost:5000/api ADMIN_EMAIL=... ADMIN_PASSWORD=... bash tests/e2e/p2p-flow.sh
set -euo pipefail

API="${API:-http://localhost:5000/api}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@nexuspin.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin123!}"
TMP="$(mktemp -d)"
RUN="$(date +%s)"
PASS=0
FAIL=0

json() { node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const o=JSON.parse(d);const v=$1;console.log(typeof v==='object'?JSON.stringify(v):v)})"; }
req() { # req <jar> <method> <path> [body]
  local jar="$1" method="$2" path="$3" body="${4:-}"
  if [ -n "$body" ]; then
    curl -s -b "$TMP/$jar" -c "$TMP/$jar" -X "$method" -H 'Content-Type: application/json' -d "$body" "$API$path"
  else
    curl -s -b "$TMP/$jar" -c "$TMP/$jar" -X "$method" "$API$path"
  fi
}
check() { # check <name> <actual> <expected>
  if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "  ✓ $1"; else FAIL=$((FAIL+1)); echo "  ✗ $1 (beklenen: $3, gelen: $2)"; fi
}

echo "▶ Kayıt / giriş"
req seller POST /auth/register "{\"email\":\"seller$RUN@test.dev\",\"name\":\"Satıcı $RUN\",\"password\":\"Sifre1234\",\"acceptTerms\":true}" >/dev/null
req buyer  POST /auth/register "{\"email\":\"buyer$RUN@test.dev\",\"name\":\"Alıcı $RUN\",\"password\":\"Sifre1234\",\"acceptTerms\":true}" >/dev/null
req buyer2 POST /auth/register "{\"email\":\"buyerb$RUN@test.dev\",\"name\":\"Alıcı B $RUN\",\"password\":\"Sifre1234\",\"acceptTerms\":true}" >/dev/null
check "HttpOnly cookie set" "$(grep -c '#HttpOnly_' "$TMP/buyer")" "1"
check "token gövdede dönmüyor" "$(req buyer GET /auth/me | json 'o.data.token===undefined')" "true"
LOGIN=$(req admin POST /auth/login "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
check "admin girişi" "$(echo "$LOGIN" | json 'o.success')" "true"
SELLER_ID=$(req seller GET /auth/me | json 'o.data.id')
BUYER_ID=$(req buyer GET /auth/me | json 'o.data.id')
BUYER2_ID=$(req buyer2 GET /auth/me | json 'o.data.id')

echo "▶ Güvenlik"
check "bedava bakiye yükleme kapalı" "$(req buyer POST /wallet/topup '{"amount":1000}' | json 'o.error.code')" "WALLET_TOPUP_DISABLED"
check "kredi kartı ile ödeme reddedilir" "$(req buyer POST /orders/checkout '{"paymentMethod":"CREDIT_CARD"}' | json 'o.error.code')" "VALIDATION_ERROR"
check "yetkisiz admin erişimi" "$(req buyer GET /users/admin | json 'o.error.code')" "PERMISSION_DENIED"
check "yabancı origin reddedilir" "$(curl -s -X POST -H 'Origin: https://evil.example' -H 'Content-Type: application/json' -d '{}' "$API/auth/logout" | json 'o.error.code')" "ORIGIN_NOT_ALLOWED"
check "bilinmeyen endpoint 404" "$(req buyer GET /yok-boyle-bir-sey | json 'o.error.code')" "ROUTE_NOT_FOUND"

echo "▶ Satıcı onboarding"
REQ_ID=$(req seller POST /seller-requests '{"reason":"Oyun kodları satmak istiyorum, stoklarım hazır."}' | json 'o.data.id')
check "başvuru onayı" "$(req admin POST /seller-requests/$REQ_ID/resolve '{"action":"APPROVED"}' | json 'o.data.status')" "APPROVED"
check "çift onay engellenir" "$(req admin POST /seller-requests/$REQ_ID/resolve '{"action":"APPROVED"}' | json 'o.error.code')" "REQUEST_ALREADY_RESOLVED"
STORE=$(req seller POST /stores "{\"name\":\"Test Mağaza $RUN\",\"slug\":\"test-magaza-$RUN\",\"logoUrl\":\"/logo.png\",\"coverUrl\":\"/cover.png\"}")
check "mağaza oluşturma" "$(echo "$STORE" | json 'o.success')" "true"
check "mağaza yanıtında e-posta yok" "$(req buyer GET /stores/test-magaza-$RUN | json 'o.data.owner.email===undefined')" "true"

CAT_ID=$(req buyer GET /categories | json 'o.data[0].id')
LISTING=$(req seller POST /products/listings "{\"title\":\"Race Test Kod $RUN\",\"description\":\"Anında teslim test kodu\",\"categoryId\":\"$CAT_ID\",\"price\":100,\"deliveryType\":\"INSTANT\",\"codes\":[\"CODE-A-$RUN\",\"CODE-B-$RUN\",\"CODE-C-$RUN\",\"CODE-A-$RUN\"]}")
PRODUCT_ID=$(echo "$LISTING" | json 'o.data.id')
PRODUCT_SLUG=$(echo "$LISTING" | json 'o.data.slug')
check "onaysız ilan vitrinde görünmez" "$(req buyer GET /products/$PRODUCT_SLUG | json 'o.error.code')" "PRODUCT_NOT_FOUND"
req admin POST /products/admin/$PRODUCT_ID/approve >/dev/null
VARIANT_ID=$(req buyer GET /products/$PRODUCT_SLUG | json 'o.data.variants[0].id')
check "tekrarlı kodlar ayıklandı (stok 3)" "$(req buyer GET /products/$PRODUCT_SLUG | json 'o.data.totalStock')" "3"

echo "▶ Yayından kaldırma"
check "ilan yayından kaldırılır" "$(req seller PATCH /products/$PRODUCT_ID/visibility '{"isListed":false}' | json 'o.data.isListed')" "false"
check "yayında olmayan ilan vitrinde görünmez" "$(req buyer GET /products/$PRODUCT_SLUG | json 'o.error.code')" "PRODUCT_NOT_FOUND"
check "yayında olmayan ilan satın alınamaz" "$(req buyer POST /orders/checkout "{\"paymentMethod\":\"WALLET\",\"acceptTerms\":true,\"items\":[{\"variantId\":\"$VARIANT_ID\",\"quantity\":1}]}" | json 'o.error.code')" "NOT_PURCHASABLE"
check "başkası yayın durumunu değiştiremez" "$(req buyer PATCH /products/$PRODUCT_ID/visibility '{"isListed":true}' | json 'o.error.code')" "FORBIDDEN"
check "ilan tek tuşla yeniden yayına alınır" "$(req seller PATCH /products/$PRODUCT_ID/visibility '{"isListed":true}' | json 'o.data.isListed')" "true"
check "stok korunur (3)" "$(req buyer GET /products/$PRODUCT_SLUG | json 'o.data.totalStock')" "3"
check "satıcı kendi ilanını alamaz" "$(req seller POST /cart/items "{\"variantId\":\"$VARIANT_ID\",\"quantity\":1}" | json 'o.error.code')" "NOT_PURCHASABLE"

echo "▶ Cüzdan (yönetici tanımı)"
req admin POST /wallet/admin/$BUYER_ID/adjust '{"amount":250,"note":"Test bakiyesi"}' >/dev/null
req admin POST /wallet/admin/$BUYER2_ID/adjust '{"amount":250,"note":"Test bakiyesi"}' >/dev/null
check "alıcı bakiyesi 250" "$(req buyer GET /wallet | json 'o.data.walletBalance')" "250"

echo "▶ Eşzamanlı checkout (race condition)"
# İki alıcı aynı anda 2'şer kod ister; stokta 3 kod var → yalnızca biri başarılı olmalı
BODY="{\"paymentMethod\":\"WALLET\",\"acceptTerms\":true,\"items\":[{\"variantId\":\"$VARIANT_ID\",\"quantity\":2}]}"
req buyer POST /orders/checkout "$BODY" > "$TMP/r1" &
req buyer2 POST /orders/checkout "$BODY" > "$TMP/r2" &
wait
OK_COUNT=$(( $(json 'o.success?1:0' < "$TMP/r1") + $(json 'o.success?1:0' < "$TMP/r2") ))
check "yalnızca bir checkout başarılı" "$OK_COUNT" "1"
check "kalan stok 1" "$(req buyer GET /products/$PRODUCT_SLUG | json 'o.data.totalStock')" "1"
if [ "$(json 'o.success' < "$TMP/r1")" = "true" ]; then WIN=buyer; LOSE=buyer2; RES="$TMP/r1"; else WIN=buyer2; LOSE=buyer; RES="$TMP/r2"; fi
check "kaybeden alıcının parası düşmedi" "$(req $LOSE GET /wallet | json 'o.data.walletBalance')" "250"
check "kazanan alıcıdan 200 düştü" "$(req $WIN GET /wallet | json 'o.data.walletBalance')" "50"
ORDER_ID=$(json 'o.data.orders[0].id' < "$RES")
check "pin listesinde düz kod yok" "$(req $WIN GET /pins | json 'o.data.every(p=>p.rawCode===undefined && p.code===undefined)')" "true"

echo "▶ İtiraz → satıcı iadesi"
DISPUTE=$(req $WIN POST /disputes "{\"orderId\":\"$ORDER_ID\",\"reason\":\"INVALID_CODE\",\"description\":\"Kod aktivasyonda geçersiz hatası veriyor, video ekledim.\",\"videoUrl\":\"https://youtu.be/dQw4w9WgXcQ\"}")
DISPUTE_ID=$(echo "$DISPUTE" | json 'o.data.id')
check "itiraz açıldı" "$(echo "$DISPUTE" | json 'o.data.status')" "WAITING_SELLER"
check "itirazlı sipariş onaylanamaz" "$(req $WIN POST /orders/$ORDER_ID/confirm | json 'o.success')" "false"
check "destek itiraz detayını görebilir" "$(req admin GET /disputes/$DISPUTE_ID | json 'o.success')" "true"
req seller POST /disputes/$DISPUTE_ID/seller-respond '{"action":"REFUND","response":"Haklısınız, iade ediyorum."}' > "$TMP/refund1" &
req seller POST /disputes/$DISPUTE_ID/seller-respond '{"action":"REFUND","response":"Haklısınız, iade ediyorum."}' > "$TMP/refund2" &
wait
check "çift iade engellendi" "$(( $(json 'o.success?1:0' < "$TMP/refund1") + $(json 'o.success?1:0' < "$TMP/refund2") ))" "1"
check "alıcıya 200 iade edildi" "$(req $WIN GET /wallet | json 'o.data.walletBalance')" "250"

echo "▶ Onay → satıcıya ödeme"
BODY1="{\"paymentMethod\":\"WALLET\",\"acceptTerms\":true,\"items\":[{\"variantId\":\"$VARIANT_ID\",\"quantity\":1}]}"
ORDER2=$(req $LOSE POST /orders/checkout "$BODY1" | json 'o.data.orders[0].id')
req $LOSE POST /orders/$ORDER2/confirm > "$TMP/c1" &
req $LOSE POST /orders/$ORDER2/confirm > "$TMP/c2" &
wait
check "çift onay engellendi" "$(( $(json 'o.success?1:0' < "$TMP/c1") + $(json 'o.success?1:0' < "$TMP/c2") ))" "1"
# Satıcıya, onaylanan siparişlerin komisyon düşülmüş net tutarı geçer
NET=$(req seller GET '/orders/sales?filter=all&limit=100' | json 'Math.round(o.data.filter(x=>x.escrowStatus==="RELEASED_TO_SELLER").reduce((s,x)=>s+x.sellerAmount,0)*100)/100')
check "satıcı bakiyesi = net satış tutarı ($NET)" "$(req seller GET /wallet | json 'o.data.walletBalance')" "$NET"
check "komisyon satıcı tutarından düşülür" "$(req seller GET '/orders/sales?filter=all&limit=100' | json 'o.data.every(x=>Math.abs(x.totalAmount-x.commissionAmount-x.sellerAmount)<0.001)')" "true"
check "ledger kayıtları" "$(req seller GET /wallet/transactions | json 'o.data.length')" "1"
check "stok tükendi" "$(req buyer GET /products/$PRODUCT_SLUG | json 'o.data.totalStock')" "0"

echo "▶ Manuel teslimat"
MANUAL=$(req seller POST /products/listings "{\"title\":\"Manuel Hesap $RUN\",\"description\":\"Satıcı teslimatlı ürün\",\"categoryId\":\"$CAT_ID\",\"price\":20,\"deliveryType\":\"MANUAL\",\"deliveryDeadlineHours\":2,\"stockCount\":5}")
req admin POST /products/admin/$(echo "$MANUAL" | json 'o.data.id')/approve >/dev/null
MVAR=$(req buyer GET /products/$(echo "$MANUAL" | json 'o.data.slug') | json 'o.data.variants[0].id')
MORDER=$(req $LOSE POST /orders/checkout "{\"paymentMethod\":\"WALLET\",\"acceptTerms\":true,\"items\":[{\"variantId\":\"$MVAR\",\"quantity\":1}]}" | json 'o.data.orders[0].id')
check "satıcı bekleyen siparişi görür" "$(req seller GET '/orders/sales?filter=pending' | json 'o.data.length')" "1"
check "süre dolmadan iptal edilemez" "$(req $LOSE POST /orders/$MORDER/cancel | json 'o.error.code')" "DEADLINE_NOT_PASSED"
check "satıcı teslim eder" "$(req seller POST /orders/$MORDER/deliver '{"deliveryNotes":"Hesap bilgileri ektedir","codes":["user:pass"]}' | json 'o.data.deliveryStatus')" "DELIVERED"
check "tekrar teslim engellenir" "$(req seller POST /orders/$MORDER/deliver '{"deliveryNotes":"tekrar"}' | json 'o.error.code')" "ALREADY_DELIVERED"

echo "▶ Ödeme yöntemleri"
# Ağ adı JSON kaçışıyla gönderilir (Windows kabuğu ASCII dışı argümanları UTF-8 iletmeyebilir)
TX="0x$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")"
check "admin kripto adresini tanımlar" "$(req admin PUT /payments/admin/gateways/CRYPTO_MANUAL '{"isEnabled":true,"settings":{"wallets":"USDT | TRC20 | TE2Etest0000000000000000000000000"}}' | json 'o.data.isEnabled')" "true"
check "kullanıcı kripto yöntemini görür" "$(req buyer2 GET /payments/methods | json 'o.data.some(m=>m.provider==="CRYPTO_MANUAL"&&m.wallets.length===1)')" "true"
DEP=$(req buyer2 POST /deposits/crypto "{\"amount\":150,\"network\":\"USDT \u00b7 TRC20\",\"txHash\":\"$TX\"}" | json 'o.data.id')
BEFORE=$(req buyer2 GET /wallet | json 'o.data.walletBalance')
req admin POST /deposits/$DEP/approve '{"approvedAmount":150}' >/dev/null
check "kripto yükleme onayla bakiyeye geçer" "$(req buyer2 GET /wallet | json "Math.round((o.data.walletBalance-$BEFORE)*100)/100")" "150"
check "API anahtarı yanıtta maskelenir" "$(req admin PUT /payments/admin/gateways/STRIPE '{"isEnabled":true,"secrets":{"secretKey":"sk_test_e2e_gecersiz_anahtar_1234","webhookSecret":"whsec_e2e"}}' | json 'o.data.secrets.secretKey')" "••••1234"
check "geçersiz anahtarla ödeme sağlayıcı hatası döner" "$(req buyer2 POST /payments/checkout '{"provider":"STRIPE","amount":100}' | json 'o.error.code')" "PAYMENT_PROVIDER_ERROR"
check "başarısız ödeme kaydı tutulur" "$(req buyer2 GET /payments/mine | json 'o.data[0].status')" "FAILED"
check "imzasız webhook reddedilir" "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{"type":"checkout.session.completed"}' "$API/payments/webhooks/stripe")" "400"
# Geliştirme ortamı ilk haline döner
req admin PUT /payments/admin/gateways/STRIPE '{"isEnabled":false,"secrets":{"secretKey":null,"webhookSecret":null}}' >/dev/null
req admin PUT /payments/admin/gateways/CRYPTO_MANUAL '{"isEnabled":false}' >/dev/null
check "kapatılan yöntem listeden kalkar" "$(req buyer2 GET /payments/methods | json 'o.data.some(m=>m.provider==="STRIPE"||m.provider==="CRYPTO_MANUAL")')" "false"

echo "▶ Temizlik"
req seller DELETE /products/$PRODUCT_ID >/dev/null
check "satışı olan ilan kapatıldı, vitrinden kalktı" "$(req buyer GET /products/$PRODUCT_SLUG | json 'o.error.code')" "PRODUCT_NOT_FOUND"
check "çıkış cookie'yi siler" "$(req buyer POST /auth/logout >/dev/null; req buyer GET /auth/me | json 'o.error.code')" "UNAUTHORIZED"

rm -rf "$TMP"
echo
echo "Sonuç: $PASS başarılı, $FAIL başarısız"
[ "$FAIL" -eq 0 ]
