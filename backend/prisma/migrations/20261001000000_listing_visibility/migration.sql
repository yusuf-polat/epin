-- Satıcının geri alınabilir şekilde ilanı yayından kaldırabilmesi
ALTER TABLE "products" ADD COLUMN "isListed" BOOLEAN NOT NULL DEFAULT true;
