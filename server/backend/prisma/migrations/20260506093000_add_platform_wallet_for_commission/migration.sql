-- CreateEnum
CREATE TYPE "PlatformTransactionType" AS ENUM ('COMMISSION_INCOME', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "platform_wallets" (
    "id" TEXT NOT NULL,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalCommissionEarned" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_transactions" (
    "id" TEXT NOT NULL,
    "platformWalletId" TEXT NOT NULL,
    "type" "PlatformTransactionType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "balanceAfter" DECIMAL(14,2) NOT NULL,
    "note" TEXT,
    "bookingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_transactions_platformWalletId_createdAt_idx" ON "platform_transactions"("platformWalletId", "createdAt");

-- AddForeignKey
ALTER TABLE "platform_transactions" ADD CONSTRAINT "platform_transactions_platformWalletId_fkey"
FOREIGN KEY ("platformWalletId") REFERENCES "platform_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

