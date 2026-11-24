// DEV ONLY sample data so the admin UI has something to show. Prices and people are invented.
import { PrismaClient } from "@prisma/client";
import { addDays, localToday } from "../src/common/dates";

if (process.env.NODE_ENV === "production") throw new Error("Refusing to load sample data in production");
const db = new PrismaClient();

async function main() {
  const branch = await db.gymBranch.findFirstOrThrow();
  if ((await db.membershipPlan.count()) > 0) { console.log("Plans already exist; skipping sample data"); return; }
  const plans = await Promise.all([["Monthly (sample)", 30, 200000], ["Quarterly (sample)", 90, 540000], ["Half-Yearly (sample)", 180, 1000000], ["Annual (sample)", 365, 1800000]].map(([name, durationDays, pricePaise], i) =>
    db.membershipPlan.create({ data: { branchId: branch.id, name: name as string, durationDays: durationDays as number, pricePaise: pricePaise as number, sortOrder: i } })));
  const role = await db.role.findUniqueOrThrow({ where: { key: "MEMBER" } });
  const today = localToday();
  const people: [string, string, number, number, number][] = [ // name, phone, plan index, start offset (days), paid fraction %
    ["Sample Member A", "+919800000001", 3, -150, 100], ["Sample Member B", "+919800000002", 1, -88, 100], ["Sample Member C", "+919800000003", 0, -35, 100],
    ["Sample Member D", "+919800000004", 2, -20, 100], ["Sample Member E", "+919800000005", 0, -26, 50],
  ];
  for (const [i, [name, phone, pi, off, pct]] of people.entries()) {
    const u = await db.user.create({ data: { phone, branchId: branch.id, roles: { create: { roleId: role.id } } } });
    const m = await db.member.create({ data: { userId: u.id, branchId: branch.id, memberCode: `GYM-${String(i + 1).padStart(4, "0")}`, name, qrSecret: `sample-${i}-secret`, joinedOn: addDays(today, off) } });
    const plan = plans[pi]; const start = addDays(today, off);
    const sub = await db.memberSubscription.create({ data: { memberId: m.id, planId: plan.id, startDate: start, endDate: addDays(start, plan.durationDays - 1), status: addDays(start, plan.durationDays - 1) >= today ? "ACTIVE" : "EXPIRED", pricePaiseSnapshot: plan.pricePaise } });
    const paid = Math.round((plan.pricePaise * pct) / 100);
    const pay = await db.payment.create({ data: { memberId: m.id, subscriptionId: sub.id, amountDuePaise: plan.pricePaise, amountPaidPaise: paid, status: pct === 100 ? "PAID" : "PARTIAL", idempotencyKey: `sample-${i}`, receiptNo: `LFG-SAMPLE-${String(i + 1).padStart(6, "0")}` } });
    await db.paymentTransaction.create({ data: { paymentId: pay.id, method: "UPI", amountPaise: paid, status: "SUCCESS", createdAt: addDays(today, Math.min(0, off + 1)) } });
  }
  console.log("Loaded sample plans and 5 sample members");
}
main().finally(() => db.$disconnect());
