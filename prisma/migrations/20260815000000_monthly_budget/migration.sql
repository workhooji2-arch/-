-- The budget was a single figure reused for every month, but the amount
-- differs month to month. It now lives per month. The existing figure is
-- carried into the current month before the old table goes, so it is not
-- silently lost; other months start empty.

-- CreateTable
CREATE TABLE "MonthlyBudget" (
    "month" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyBudget_pkey" PRIMARY KEY ("month")
);

-- Carry the old single figure into the month it was last showing for.
INSERT INTO "MonthlyBudget" ("month", "amount", "updatedAt")
SELECT to_char(now() AT TIME ZONE 'Asia/Seoul', 'YYYY-MM'), "monthlyBudget", now()
FROM "Setting"
WHERE "monthlyBudget" > 0;

-- DropTable
DROP TABLE "Setting";
