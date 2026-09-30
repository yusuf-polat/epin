#!/bin/sh
set -e

# Migration geçmişi olmayan (eski `prisma db push` ile oluşturulmuş) veritabanlarını
# önce 0_init şemasına getir, ardından 0_init'i uygulanmış olarak işaretle.
set +e
node dist/database/baseline.js
status=$?
set -e
if [ "$status" = "10" ]; then
  echo "Legacy schema without migration history detected, aligning to 0_init baseline..."
  npx prisma migrate diff \
    --from-url "$DATABASE_URL" \
    --to-schema-datamodel prisma/baseline/schema.prisma \
    --script > /tmp/baseline.sql
  if grep -qiE '^\s*(DROP TABLE|ALTER TABLE .* DROP COLUMN)' /tmp/baseline.sql; then
    echo "Baseline alignment would drop data, aborting. Review /tmp/baseline.sql manually."
    cat /tmp/baseline.sql
    exit 1
  fi
  npx prisma db execute --file /tmp/baseline.sql --schema prisma/schema.prisma
  npx prisma migrate resolve --applied 0_init
elif [ "$status" != "0" ]; then
  echo "Baseline check failed (exit $status)"
  exit "$status"
fi

npx prisma migrate deploy

if [ "${RUN_SEED:-true}" = "true" ]; then
  node dist/database/seed.js
fi

exec node dist/server.js
