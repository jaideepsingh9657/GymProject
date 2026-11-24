import { Injectable } from "@nestjs/common";
import { branchOf } from "../common/branch";
import { AuthUser } from "../common/decorators";
import { addDays, iso, localToday } from "../common/dates";
import { EXPIRING_DAYS } from "../members/membership-state";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private readonly db: PrismaService) {}

  async today(user: AuthUser) {
    const branchId = branchOf(user);
    const today = localToday();
    const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    const since = addDays(today, -13);
    const memberOfBranch = { member: { branchId, deletedAt: null } };

    const [checkIns, active, renewals, dues, txns, enquiries] = await Promise.all([
      this.db.attendance.count({ where: { branchId, localDate: today } }),
      this.db.memberSubscription.groupBy({ by: ["memberId"], where: { ...memberOfBranch, status: "ACTIVE", startDate: { lte: today }, endDate: { gte: today } } }),
      this.db.memberSubscription.findMany({
        where: { ...memberOfBranch, status: "ACTIVE", endDate: { gte: addDays(today, -3), lte: addDays(today, EXPIRING_DAYS) } },
        orderBy: { endDate: "asc" }, take: 20,
        select: { id: true, endDate: true, plan: { select: { name: true } }, member: { select: { id: true, name: true, memberCode: true } } },
      }),
      this.db.payment.findMany({ where: { status: { in: ["PENDING", "PARTIAL"] }, member: { branchId } }, select: { amountDuePaise: true, amountPaidPaise: true, memberId: true } }),
      this.db.paymentTransaction.findMany({ where: { status: "SUCCESS", createdAt: { gte: since }, payment: { member: { branchId } } }, select: { type: true, amountPaise: true, createdAt: true } }),
      this.db.enquiry.groupBy({ by: ["status"], where: { branchId, status: { in: ["NEW", "TRIAL_BOOKED"] } }, _count: true }),
    ]);

    const signed = (t: { type: string; amountPaise: number }) => (t.type === "REFUND" ? -t.amountPaise : t.amountPaise);
    const byDay = new Map<string, number>();
    for (let i = 0; i < 14; i++) byDay.set(iso(addDays(since, i)), 0);
    let revenueMonth = 0;
    for (const t of txns) {
      const d = iso(new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(t.createdAt) + "T00:00:00Z"));
      byDay.set(d, (byDay.get(d) ?? 0) + signed(t));
    }
    // Month-to-date can start before the 14-day window, so it needs its own sum.
    if (monthStart < since) {
      const earlier = await this.db.paymentTransaction.findMany({ where: { status: "SUCCESS", createdAt: { gte: monthStart, lt: since }, payment: { member: { branchId } } }, select: { type: true, amountPaise: true } });
      revenueMonth += earlier.reduce((a, t) => a + signed(t), 0);
    }
    revenueMonth += txns.filter((t) => t.createdAt >= monthStart).reduce((a, t) => a + signed(t), 0);

    return {
      date: iso(today),
      checkInsToday: checkIns,
      activeMembers: active.length,
      revenueMonthPaise: revenueMonth,
      pendingDuesPaise: dues.reduce((a, p) => a + (p.amountDuePaise - p.amountPaidPaise), 0),
      membersWithDues: new Set(dues.map((d) => d.memberId)).size,
      renewalsDue: renewals.map((r) => ({ subscriptionId: r.id, endDate: iso(r.endDate), daysLeft: Math.round((r.endDate.getTime() - today.getTime()) / 86_400_000), plan: r.plan.name, member: r.member })),
      enquiries: Object.fromEntries(enquiries.map((e) => [e.status, e._count])),
      revenueByDay: [...byDay].map(([date, paise]) => ({ date, paise })),
    };
  }
}
