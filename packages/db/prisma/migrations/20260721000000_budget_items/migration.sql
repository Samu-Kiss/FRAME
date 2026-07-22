-- CreateEnum
CREATE TYPE "BudgetCategory" AS ENUM ('CAST', 'CREW', 'LOCATIONS', 'EQUIPMENT', 'ART_PROPS', 'WARDROBE_MAKEUP', 'TRANSPORT', 'CATERING', 'POST', 'INSURANCE', 'CONTINGENCY', 'OTHER');

-- CreateTable
CREATE TABLE "BudgetItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" "BudgetCategory" NOT NULL,
    "label" TEXT NOT NULL,
    "estimated" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actual" DOUBLE PRECISION,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" TEXT,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BudgetItem_projectId_idx" ON "BudgetItem"("projectId");

-- CreateIndex
CREATE INDEX "BudgetItem_category_idx" ON "BudgetItem"("category");

-- AddForeignKey
ALTER TABLE "BudgetItem" ADD CONSTRAINT "BudgetItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
