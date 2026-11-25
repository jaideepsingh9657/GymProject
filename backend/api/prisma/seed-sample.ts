// DEV ONLY sample data so the admin UI has something to show. Prices and people are invented.
import { PrismaClient } from "@prisma/client";
import { addDays, localToday } from "../src/common/dates";

if (process.env.NODE_ENV === "production") throw new Error("Refusing to load sample data in production");
const db = new PrismaClient();

async function main() {
  const branch = await db.gymBranch.findFirstOrThrow();
  if ((await db.membershipPlan.count()) > 0) { console.log("Plans already exist; skipping sample plans and members"); await sampleAttendance(branch.id); return; }
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
  await sampleAttendance(branch.id);
}
main().finally(() => db.$disconnect());

/** 30 days of invented check-ins (mornings and evenings, 45 to 90 min) so charts have something to show. */
async function sampleAttendance(branchId: string) {
  if ((await db.attendance.count()) >= 10) { console.log("Attendance already present; skipping"); return; }
  const members = await db.member.findMany({ where: { branchId, memberCode: { in: ["GYM-0001", "GYM-0002", "GYM-0004", "GYM-0005"] } } });
  const today = localToday();
  let n = 0;
  for (let back = 29; back >= 1; back--) {
    const localDate = addDays(today, -back);
    for (const [mi, m] of members.entries()) {
      const roll = (back * 7 + mi * 13) % 10; // deterministic, ~60% attendance
      if (roll > 5) continue;
      const hour = roll % 2 === 0 ? 6 + (roll % 3) : 17 + (roll % 4); // IST hour
      const inAt = new Date(localDate.getTime() + (hour - 5.5) * 3_600_000 + (mi * 7 + back) % 50 * 60_000);
      const outAt = new Date(inAt.getTime() + (45 + (back * 5 + mi * 11) % 46) * 60_000);
      await db.attendance.create({ data: { memberId: m.id, branchId, localDate, checkInAt: inAt, checkOutAt: outAt, method: "MANUAL" } }).then(() => n++).catch(() => {});
    }
  }
  console.log(`Loaded ${n} sample check-ins`);
}
