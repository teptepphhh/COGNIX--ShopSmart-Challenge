-- Improvement 2: idempotent checkout. Existing orders keep idempotencyKey = NULL.
-- PostgreSQL allows many NULLs in a unique index, so old orders are not affected.

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_userId_idempotencyKey_key" ON "Order"("userId", "idempotencyKey");
