-- The hourly rate lived on the TA, but the rate depends on what they are
-- doing, so it moves into a list of tasks like the piece-rate ones. The list
-- is filled from the existing column before that column is dropped, so no rate
-- already in use is lost.

-- CreateTable
CREATE TABLE "HourlyTask" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "rate" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HourlyTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HourlyTask_userId_idx" ON "HourlyTask"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HourlyTask_userId_label_key" ON "HourlyTask"("userId", "label");

-- AddForeignKey
ALTER TABLE "HourlyTask" ADD CONSTRAINT "HourlyTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "WorkSession" ADD COLUMN     "label" TEXT NOT NULL DEFAULT '근무',
ADD COLUMN     "taskId" TEXT;

-- AddForeignKey
ALTER TABLE "WorkSession" ADD CONSTRAINT "WorkSession_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "HourlyTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "currentTaskId" TEXT;

-- Carry each existing hourly rate over as that TA's first task.
INSERT INTO "HourlyTask" ("id", "userId", "label", "rate")
SELECT gen_random_uuid()::text, "id", '기본 근무', "wage"
FROM "User"
WHERE "wage" IS NOT NULL;

-- Point work already recorded at the task it came from.
UPDATE "WorkSession" AS w
SET "taskId" = t."id", "label" = t."label"
FROM "HourlyTask" AS t
WHERE t."userId" = w."userId";

-- DropColumn (now that every rate has been copied out of it)
ALTER TABLE "User" DROP COLUMN "wage";
