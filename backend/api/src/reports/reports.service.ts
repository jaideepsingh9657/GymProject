import { BadRequestException, Injectable } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { branchOf } from "../common/branch";
import { csvCell, rupees, toCsv } from "../common/csv";
import { AuthUser } from "../common/decorators";
import { addDays, iso, localToday, parseDate } from "../common/dates";
import { PrismaService } from "../prisma/prisma.service";

const IST_OFFSET_MS = 5.5 * 3_600_000;
const istDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });
const MAX_DAYS = 366;

interface Range { from: Date; to: Date; start: Date; end: Date; days: number }

@Injectable()
export class ReportsService {
  constructor(private readonly db: PrismaService, private readonly audit: AuditService) {}

  /** Inclusive branch-local day range; `start`/`end` are the matching instants (end exclusive). */
  private range(fromS?: string, toS?: string): Range {
    const today = localToday();
    const to = toS ? parseDate(toS) : today;
    const from = fromS ? parseDate(fromS) : addDays(to, -29);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) throw new BadRequestException("Invalid date");
    if (from > to) throw new BadRequestException("from must be on or before to");
    const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
    if (days > MAX_DAYS) throw new BadRequestException(`Range can't exceed ${MAX_DAYS} days`);
    return { from, to, days, start: new Date(from.getTime() - IST_OFFSET_MS), end: new Date(addDays(to, 1).getTime() - IST_OFFSET_MS) };
  }

  async summary(user: AuthUser, fromS?: string, toS?: string) {
    const branchId = branchOf(user);
    const r = this.range(fromS, toS);
    const inBranch = { member: { branchId, deletedAt: null } };

    const [txns, sold, expiring, newMembers, open, joined] = await Promise.all([
      this.db.paymentTransaction.findMany({ where: { status: "SUCCESS", createdAt: { gte: r.start, lt: r.end }, payment: inBranch }, select: { type: true, method: true, amountPaise: true, createdAt: true } }),
      this.db.memberSubscription.findMany({ where: { createdAt: { gte: r.start, lt: r.end }, ...inBranch }, select: { status: true, pricePaiseSnapshot: true, parentSubscriptionId: true, plan: { select: { name: true } } } }),
      this.db.memberSubscription.findMany({ where: { endDate: { gte: r.from, lte: r.to }, status: { not: "CANCELLED" }, ...inBranch }, select: { id: true, memberId: true, startDate: true } }),
      this.db.member.count({ where: { branchId, deletedAt: null, joinedOn: { gte: r.from, lte: r.to } } }),
      this.db.payment.findMany({ where: { status: { in: ["PENDING", "PARTIAL"] }, ...inBranch }, orderBy: { createdAt: "asc" }, select: { id: true, amountDuePaise: true, amountPaidPaise: true, createdAt: true, member: { select: { id: true, name: true, memberCode: true } } } }),
      this.db.member.findMany({ where: { branchId, deletedAt: null, joinedOn: { gte: addDays(localToday(), -365) } }, select: { joinedOn: true } }),
    ]);

    // Revenue: charges minus refunds, per day and per method.
    const signed = (t: { type: string; amountPaise: number }) => (t.type === "REFUND" ? -t.amountPaise : t.amountPaise);
    const byDay = new Map<string, number>();
    for (let i = 0; i < r.days; i++) byDay.set(iso(addDays(r.from, i)), 0);
    const byMethod = new Map<string, number>();
    let revenue = 0;
    for (const t of txns) {
      const d = istDay.format(t.createdAt);
      byDay.set(d, (byDay.get(d) ?? 0) + signed(t));
      byMethod.set(t.method, (byMethod.get(t.method) ?? 0) + signed(t));
      revenue += signed(t);
    }

    // Sales by plan; every sale counts even if later cancelled (cancelled shown separately).
    const plans = new Map<string, { count: number; revenuePaise: number }>();
    for (const s of sold) {
      const p = plans.get(s.plan.name) ?? { count: 0, revenuePaise: 0 };
      p.count++; p.revenuePaise += s.pricePaiseSnapshot; plans.set(s.plan.name, p);
    }

    // Renewal rate: of memberships that ended in the range, how many members went on to hold a later one.
    let renewed = 0;
    if (expiring.length) {
      const later = await this.db.memberSubscription.findMany({ where: { memberId: { in: expiring.map((e) => e.memberId) }, status: { not: "CANCELLED" } }, select: { id: true, memberId: true, startDate: true } });
      for (const e of expiring) if (later.some((l) => l.memberId === e.memberId && l.id !== e.id && l.startDate > e.startDate)) renewed++;
    }

    // Member growth: joins per month for the last 12 months.
    const months = new Map<string, number>();
    const t0 = localToday();
    for (let i = 11; i >= 0; i--) months.set(iso(new Date(Date.UTC(t0.getUTCFullYear(), t0.getUTCMonth() - i, 1))).slice(0, 7), 0);
    for (const m of joined) { const k = iso(m.joinedOn).slice(0, 7); if (months.has(k)) months.set(k, months.get(k)! + 1); }

    return {
      from: iso(r.from), to: iso(r.to), days: r.days,
      revenuePaise: revenue,
      sales: { total: sold.length, new: sold.filter((s) => !s.parentSubscriptionId).length, renewals: sold.filter((s) => s.parentSubscriptionId).length, cancelled: sold.filter((s) => s.status === "CANCELLED").length },
      renewal: { expiring: expiring.length, renewed, ratePercent: expiring.length ? Math.round((renewed / expiring.length) * 1000) / 10 : null },
      newMembers,
      outstanding: {
        totalPaise: open.reduce((a, p) => a + p.amountDuePaise - p.amountPaidPaise, 0),
        members: new Set(open.map((p) => p.member.id)).size,
        top: open.slice(0, 10).map((p) => ({ paymentId: p.id, member: p.member, owedPaise: p.amountDuePaise - p.amountPaidPaise, since: iso(new Date(istDay.format(p.createdAt) + "T00:00:00Z")) })),
      },
      revenueByDay: [...byDay].map(([date, paise]) => ({ date, paise })),
      revenueByMethod: [...byMethod].map(([method, paise]) => ({ method, paise })).sort((a, b) => b.paise - a.paise),
      salesByPlan: [...plans].map(([plan, v]) => ({ plan, ...v })).sort((a, b) => b.revenuePaise - a.revenuePaise),
      memberGrowth: [...months].map(([month, joins]) => ({ month, joins })),
    };
  }

  /** CSV download. Exports are audit-logged because they move member and money data out of the system. */
  async export(user: AuthUser, type: "sales" | "payments", fromS?: string, toS?: string) {
    const branchId = branchOf(user);
    const r = this.range(fromS, toS);
    const inBranch = { member: { branchId, deletedAt: null } };
    let csv: string;
    if (type === "sales") {
      const rows = await this.db.memberSubscription.findMany({
        where: { createdAt: { gte: r.start, lt: r.end }, ...inBranch }, orderBy: { createdAt: "asc" },
        select: { createdAt: true, startDate: true, endDate: true, status: true, pricePaiseSnapshot: true, parentSubscriptionId: true, member: { select: { memberCode: true, name: true } }, plan: { select: { name: true } }, payments: { select: { amountPaidPaise: true, receiptNo: true } } },
      });
      csv = toCsv(["Sold on", "Member code", "Member", "Plan", "Type", "Starts", "Ends", "Status", "Price (INR)", "Paid (INR)", "Receipt"],
        rows.map((s) => [istDay.format(s.createdAt), s.member.memberCode, s.member.name, s.plan.name, s.parentSubscriptionId ? "Renewal" : "New", iso(s.startDate), iso(s.endDate), s.status, rupees(s.pricePaiseSnapshot), rupees(s.payments.reduce((a, p) => a + p.amountPaidPaise, 0)), s.payments.map((p) => p.receiptNo).filter(Boolean).join(" ")]));
    } else {
      const rows = await this.db.paymentTransaction.findMany({
        where: { status: "SUCCESS", createdAt: { gte: r.start, lt: r.end }, payment: inBranch }, orderBy: { createdAt: "asc" },
        select: { createdAt: true, method: true, type: true, amountPaise: true, payment: { select: { receiptNo: true, member: { select: { memberCode: true, name: true } } } } },
      });
      csv = toCsv(["Date", "Time (IST)", "Receipt", "Member code", "Member", "Method", "Type", "Amount (INR)"],
        rows.map((t) => [istDay.format(t.createdAt), t.createdAt.toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata" }), t.payment.receiptNo, t.payment.member.memberCode, t.payment.member.name, t.method, t.type, rupees(t.type === "REFUND" ? -t.amountPaise : t.amountPaise)]));
    }
    await this.audit.record({ actorId: user.id, action: "report.export", entity: "report", after: { type, from: iso(r.from), to: iso(r.to) } });
    return csv;
  }
}
