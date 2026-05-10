-- DropForeignKey
ALTER TABLE "booking_services" DROP CONSTRAINT "booking_services_amenityId_fkey";

-- AddForeignKey
ALTER TABLE "booking_services" ADD CONSTRAINT "booking_services_amenityId_fkey" FOREIGN KEY ("amenityId") REFERENCES "amenities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
