ALTER TABLE "enquiries" ADD COLUMN "goal" TEXT;
ALTER TABLE "enquiries" ADD COLUMN "preferredTime" TEXT;
ALTER TABLE "enquiries" ADD COLUMN "notes" TEXT;
ALTER TABLE "enquiries" ADD COLUMN "isTrialRequest" BOOLEAN NOT NULL DEFAULT false;
