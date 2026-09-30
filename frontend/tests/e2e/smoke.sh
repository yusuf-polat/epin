#!/usr/bin/env bash
# Frontend smoke testi: sayfaların SSR ile render edildiğini ve oturum korumasını doğrular.
# Kullanım: WEB=http://localhost:3000 API=http://localhost:5000/api bash tests/e2e/smoke.sh
set -uo pipefail

WEB="${WEB:-http://localhost:3000}"
API="${API:-http://localhost:5000/api}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@nexuspin.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin123!}"
JAR="$(mktemp)"
PASS=0
FAIL=0

check() {
  if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "  ✓ $1"; else FAIL=$((FAIL+1)); echo "  ✗ $1 (beklenen: $3, gelen: $2)"; fi
}
status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
contains() { curl -s "$@" | grep -c "$CONTAINS" | tr -d ' '; }

echo "▶ Herkese açık sayfalar"
for path in / /katalog "/katalog?delivery=INSTANT&sort=newest" "/katalog?search=steam" "/katalog?region=TR" "/katalog?region=gecersiz" "/katalog?featured=true" /magazalar /sepet /auth/login /auth/register /auth/sifremi-unuttum /auth/eposta-dogrula /sss /hakkimizda /iletisim /sozlesmeler/kullanim-kosullari; do
  check "GET $path" "$(status "$WEB$path")" "200"
done
check "olmayan sayfa 404" "$(status "$WEB/olmayan-bir-sayfa")" "404"
check "olmayan ürün 404" "$(status "$WEB/urun/olmayan-urun-xyz")" "404"
check "olmayan mağaza 404" "$(status "$WEB/magaza/olmayan-magaza-xyz")" "404"
check "eski /hesabim/bakiye yönlendirmesi" "$(status "$WEB/hesabim/bakiye")" "308"
CONTAINS='role="search"'
check "header arama kutusu" "$(contains "$WEB/")" "1"

echo "▶ SEO"
check "GET /sitemap.xml" "$(status "$WEB/sitemap.xml")" "200"
CONTAINS='<urlset'
check "sitemap XML biçiminde" "$(contains "$WEB/sitemap.xml")" "1"
CONTAINS='/sss</loc>'
check "sitemap bilgi sayfalarını içerir" "$(contains "$WEB/sitemap.xml")" "1"
CONTAINS='Sitemap:'
check "robots.txt sitemap adresini gösterir" "$(contains "$WEB/robots.txt")" "1"
CONTAINS='Disallow: /panel'
check "robots.txt panel sayfalarını dışlar" "$(contains "$WEB/robots.txt")" "1"
CONTAINS='FAQPage'
check "SSS yapılandırılmış verisi" "$(contains "$WEB/sss")" "1"

echo "▶ Oturum koruması"
check "oturumsuz /hesabim → giriş" "$(curl -s -o /dev/null -w '%{redirect_url}' "$WEB/hesabim" | grep -c '/auth/login')" "1"
check "oturumsuz /panel → giriş" "$(curl -s -o /dev/null -w '%{redirect_url}' "$WEB/panel" | grep -c '/auth/login')" "1"

echo "▶ Oturumlu sayfalar (admin)"
curl -s -c "$JAR" -H 'Content-Type: application/json' -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" "$API/auth/login" >/dev/null
for path in /hesabim /hesabim/siparislerim /hesabim/kodlarim /hesabim/cuzdan "/hesabim/cuzdan?sekme=yukle" /hesabim/mesajlar /hesabim/pazar /hesabim/pazar/satislar /hesabim/ayarlar /panel /panel/urunler /panel/itirazlar /panel/kullanicilar /panel/destek /panel/siparisler /panel/finans /panel/odeme-yontemleri /panel/sikayetler /panel/yorumlar /panel/islem-gecmisi /panel/ayarlar /panel/bildirim-gonder; do
  check "GET $path" "$(status -b "$JAR" "$WEB$path")" "200"
done
CONTAINS='Yönetim Merkezi'
check "panel SSR ile oturum bilgisini aldı" "$(contains -b "$JAR" "$WEB/panel")" "1"

rm -f "$JAR"
echo
echo "Sonuç: $PASS başarılı, $FAIL başarısız"
[ "$FAIL" -eq 0 ]
