-- DropForeignKey
ALTER TABLE "ProductionDayLocation" DROP CONSTRAINT "ProductionDayLocation_locationId_fkey";

-- AddForeignKey
ALTER TABLE "ProductionDayLocation" ADD CONSTRAINT "ProductionDayLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

