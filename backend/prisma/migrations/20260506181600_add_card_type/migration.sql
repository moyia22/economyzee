-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('CREDIT', 'DEBIT');

-- AlterEnum (add new brands)
ALTER TYPE "CardBrand" ADD VALUE 'AMEX';
ALTER TYPE "CardBrand" ADD VALUE 'HIPERCARD';

-- AlterTable: Add card_type column with default CREDIT
ALTER TABLE "cards" ADD COLUMN "card_type" "CardType" NOT NULL DEFAULT 'CREDIT';
