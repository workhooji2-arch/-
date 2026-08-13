-- A TA can now have several piece-rate tasks, each with its own rate, instead
-- of the single rate that lived on the user row. The order here matters: the
-- new table is filled from the old column before that column is dropped, so no
-- existing rate is lost.

-- CreateTable
CREATE TABLE "UnitTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "rate" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnitTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UnitTask_userId_idx" ON "UnitTask"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UnitTask_userId_label_key" ON "UnitTask"("userId", "label");

-- AddForeignKey
ALTER TABLE "UnitTask" ADD CONSTRAINT "UnitTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "UnitWork" ADD COLUMN     "label" TEXT NOT NULL DEFAULT '개수 작업',
ADD COLUMN     "taskId" TEXT;

-- AddForeignKey
ALTER TABLE "UnitWork" ADD CONSTRAINT "UnitWork_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "UnitTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Carry each existing per-unit rate over as that TA's first task.
INSERT INTO "UnitTask" ("id", "userId", "label", "rate")
SELECT gen_random_uuid()::text, "id", '기본 작업', "unitRate"
FROM "User"
WHERE "unitRate" IS NOT NULL;

-- Point work already recorded at the task it came from.
UPDATE "UnitWork" AS w
SET "taskId" = t."id", "label" = t."label"
FROM "UnitTask" AS t
WHERE t."userId" = w."userId";

-- DropColumn (now that every rate has been copied out of it)
ALTER TABLE "User" DROP COLUMN "unitRate";
