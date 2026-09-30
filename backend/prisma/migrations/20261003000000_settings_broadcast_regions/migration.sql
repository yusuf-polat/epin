-- AlterTable
ALTER TABLE "products" ALTER COLUMN "region" SET DEFAULT 'GLOBAL';

-- AlterTable
ALTER TABLE "withdrawal_requests" ADD COLUMN     "fee" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "notification_broadcasts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "audience" TEXT NOT NULL,
    "recipientCount" INTEGER NOT NULL,
    "sendEmail" BOOLEAN NOT NULL DEFAULT false,
    "emailCount" INTEGER NOT NULL DEFAULT 0,
    "sentById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_broadcasts_createdAt_idx" ON "notification_broadcasts"("createdAt");

-- AddForeignKey
ALTER TABLE "notification_broadcasts" ADD CONSTRAINT "notification_broadcasts_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Serbest metin bölgeler sabit kodlara dönüştürülür
UPDATE "products" SET "region" = CASE
  WHEN upper(trim("region")) IN ('TR', 'TÜRKİYE', 'TURKIYE', 'TURKEY') THEN 'TR'
  WHEN "region" ILIKE '%EMEA%' THEN 'EMEA'
  WHEN "region" ILIKE '%EU%' OR "region" ILIKE '%AVRUPA%' OR "region" ILIKE '%EUROPE%' THEN 'EU'
  WHEN upper(trim("region")) IN ('US', 'USA', 'ABD') THEN 'US'
  WHEN upper(trim("region")) = 'UK' THEN 'UK'
  ELSE 'GLOBAL'
END;
