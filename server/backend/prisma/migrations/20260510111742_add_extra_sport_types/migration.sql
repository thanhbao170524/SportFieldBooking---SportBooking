-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SportType" ADD VALUE 'PADEL';
ALTER TYPE "SportType" ADD VALUE 'BILLIARDS';
ALTER TYPE "SportType" ADD VALUE 'FUTSAL';
ALTER TYPE "SportType" ADD VALUE 'TABLE_TENNIS';
ALTER TYPE "SportType" ADD VALUE 'GOLF';
