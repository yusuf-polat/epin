-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('TOPUP', 'PURCHASE', 'SALE_RELEASE', 'REFUND', 'ADMIN_ADJUSTMENT');

-- DropForeignKey
ALTER TABLE "disputes" DROP CONSTRAINT "disputes_sellerId_fkey";

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "deliveryDeadlineAt" TIMESTAMP(3),
ADD COLUMN     "sellerId" TEXT;

-- AlterTable
ALTER TABLE "disputes" ALTER COLUMN "sellerId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "orderId" TEXT,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wallet_transactions_userId_createdAt_idx" ON "wallet_transactions"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "products_sellerId_idx" ON "products"("sellerId");

-- CreateIndex
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");

-- CreateIndex
CREATE INDEX "products_approvalStatus_idx" ON "products"("approvalStatus");

-- CreateIndex
CREATE INDEX "digital_pins_variantId_status_idx" ON "digital_pins"("variantId", "status");

-- CreateIndex
CREATE INDEX "digital_pins_userId_idx" ON "digital_pins"("userId");

-- CreateIndex
CREATE INDEX "digital_pins_orderId_idx" ON "digital_pins"("orderId");

-- CreateIndex
CREATE INDEX "orders_userId_idx" ON "orders"("userId");

-- CreateIndex
CREATE INDEX "orders_sellerId_idx" ON "orders"("sellerId");

-- CreateIndex
CREATE INDEX "orders_escrowStatus_deliveryStatus_autoReleaseAt_idx" ON "orders"("escrowStatus", "deliveryStatus", "autoReleaseAt");

-- CreateIndex
CREATE INDEX "direct_messages_conversationId_createdAt_idx" ON "direct_messages"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Backfill: mevcut pazar yeri siparişlerinin satıcısını ilk kalemden türet
UPDATE "orders" o
SET "sellerId" = sub."sellerId"
FROM (
  SELECT DISTINCT ON (oi."orderId") oi."orderId", p."sellerId"
  FROM "order_items" oi
  JOIN "product_variants" v ON v."id" = oi."variantId"
  JOIN "products" p ON p."id" = v."productId"
  WHERE p."sellerId" IS NOT NULL
  ORDER BY oi."orderId", oi."id"
) sub
WHERE o."id" = sub."orderId" AND o."sellerId" IS NULL;
