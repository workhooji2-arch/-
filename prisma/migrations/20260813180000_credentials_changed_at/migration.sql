-- AlterTable
ALTER TABLE "User" ADD COLUMN     "credentialsChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Sessions already in people's browsers predate this column. Backdating the
-- existing rows to their signup time keeps those logins working, so adding
-- the column does not sign everyone out on deploy.
UPDATE "User" SET "credentialsChangedAt" = "createdAt";
