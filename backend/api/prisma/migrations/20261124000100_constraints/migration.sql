-- Integrity rules Prisma cannot express. These make the database refuse bad data
-- even if application code has a bug.

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- A member can never hold two overlapping ACTIVE/FROZEN subscriptions.
ALTER TABLE "member_subscriptions"
  ADD CONSTRAINT "no_overlapping_live_subscription"
  EXCLUDE USING gist ("memberId" WITH =, daterange("startDate", "endDate", '[]') WITH &&)
  WHERE ("status" IN ('ACTIVE', 'FROZEN'));

ALTER TABLE "member_subscriptions" ADD CONSTRAINT "subscription_dates_valid" CHECK ("endDate" >= "startDate");
ALTER TABLE "membership_plans" ADD CONSTRAINT "plan_values_valid" CHECK ("durationDays" > 0 AND "pricePaise" >= 0);
ALTER TABLE "payments" ADD CONSTRAINT "payment_amounts_valid" CHECK ("amountDuePaise" >= 0 AND "amountPaidPaise" >= 0);
ALTER TABLE "payment_transactions" ADD CONSTRAINT "transaction_amount_positive" CHECK ("amountPaise" > 0);

-- Ledger is append-only: block UPDATE/DELETE of audit rows.
CREATE OR REPLACE FUNCTION lfg_block_mutation() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION '% is append-only', TG_TABLE_NAME; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER audit_logs_immutable BEFORE UPDATE OR DELETE ON "audit_logs" FOR EACH ROW EXECUTE FUNCTION lfg_block_mutation();
