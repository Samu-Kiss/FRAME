-- DropForeignKey
ALTER TABLE "Styling" DROP CONSTRAINT "Styling_characterId_fkey";

-- DropForeignKey
ALTER TABLE "TalentCall" DROP CONSTRAINT "TalentCall_personId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_assignedToId_fkey";

-- DropIndex
DROP INDEX "Task_assignedToId_idx";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "assignedToId";

-- CreateTable
CREATE TABLE "TaskAssignee" (
    "taskId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "TaskAssignee_pkey" PRIMARY KEY ("taskId","personId")
);

-- CreateIndex
CREATE INDEX "TaskAssignee_personId_idx" ON "TaskAssignee"("personId");

-- AddForeignKey
ALTER TABLE "Styling" ADD CONSTRAINT "Styling_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TalentCall" ADD CONSTRAINT "TalentCall_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignee" ADD CONSTRAINT "TaskAssignee_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignee" ADD CONSTRAINT "TaskAssignee_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

