-- AlterTable
ALTER TABLE "owner_profiles" ADD COLUMN "notificationSettings" JSONB DEFAULT '{}'::jsonb;

