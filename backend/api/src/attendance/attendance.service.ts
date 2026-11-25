import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { branchOf } from "../common/branch";
import { AuthUser } from "../common/decorators";
import { addDays, iso, localToday, parseDate } from "../common/dates";
import { membershipState } from "../members/membership-state";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AttendanceService {
  constructor(private readonly db: PrismaService) {}

  /** Manual check-in: member must exist, not be blocked, and hold an ACTIVE (not frozen/expired) membership today. */
  async checkIn(user: AuthUser, memberCode: string) {
    const branchId = branchOf(user);
    const today = localToday();
    const member = await this.db.member.findFirst({
      where: { branchId, deletedAt: null, memberCode: { equals: memberCode.trim(), mode: "insensitive" } },
      select: { id: true, name: true, memberCode: true, status: true, subscriptions: { where: { status: { in: ["ACTIVE", "FROZEN"] } }, select: { status: true, startDate: true, endDate: true, plan: { select: { name: true } } } } },
    });
    if (!member) throw new NotFoundException("No member with that code");
    if (member.status === "BLOCKED") throw new ForbiddenException("Member is blocked");
    const st = membershipState(member.subscriptions, today);
    if (!st.current) throw new ForbiddenException(member.subscriptions.some((s) => s.status === "FROZEN") ? "Membership is frozen" : "No active membership");

    try {
      const rec = await this.db.attendance.create({ data: { memberId: member.id, branchId, localDate: today, method: "MANUAL", recordedById: user.id } });
      return { id: rec.id, checkInAt: rec.checkInAt, member: { id: member.id, name: member.name, memberCode: member.memberCode }, daysLeft: st.daysLeft, expiring: st.state === "EXPIRING" };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new ConflictException(`${member.name} has already checked in today`);
      throw e;
    }
  }

  async checkOut(user: AuthUser, id: string) {
    const rec = await this.db.attendance.findFirst({ where: { id, branchId: branchOf(user) } });
    if (!rec) throw new NotFoundException("Attendance record not found");
    if (rec.checkOutAt) throw new ConflictException("Already checked out");
    return this.db.attendance.update({ where: { id }, data: { checkOutAt: new Date() } });
  }

  today(user: AuthUser) {
    return this.db.attendance.findMany({ where: { branchId: branchOf(user), localDate: localToday() }, orderBy: { checkInAt: "desc" }, select: { id: true, checkInAt: true, checkOutAt: true, method: true, member: { select: { id: true, name: true, memberCode: true } } } });
  }

  /** Visits for one branch-local day (default today), newest first, with who is still inside. */
  async day(user: AuthUser, date?: string) {
    const d = date ? parseDate(date) : localToday();
    if (Number.isNaN(d.getTime())) throw new BadRequestException("Invalid date");
    const rows = await this.db.attendance.findMany({
      where: { branchId: branchOf(user), localDate: d }, orderBy: { checkInAt: "desc" },
      select: { id: true, checkInAt: true, checkOutAt: true, method: true, member: { select: { id: true, name: true, memberCode: true } } },
    });
    return { date: iso(d), insideNow: rows.filter((r) => !r.checkOutAt).length, items: rows };
  }

  /** Daily counts and busiest hours (branch-local) for the last N days. */
  async report(user: AuthUser, days = 30) {
    const today = localToday();
    const from = addDays(today, -(days - 1));
    const rows = await this.db.attendance.findMany({
      where: { branchId: branchOf(user), localDate: { gte: from, lte: today } },
      select: { localDate: true, checkInAt: true, checkOutAt: true, memberId: true },
    });
    const daily = new Map<string, number>();
    for (let i = 0; i < days; i++) daily.set(iso(addDays(from, i)), 0);
    const hours = new Array(24).fill(0);
    const hourFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false });
    let durMs = 0, durN = 0;
    for (const r of rows) {
      const k = iso(r.localDate);
      daily.set(k, (daily.get(k) ?? 0) + 1);
      hours[Number(hourFmt.format(r.checkInAt)) % 24]++;
      // Visits over 6h are almost always a forgotten check-out; counting them would wreck the average.
      if (r.checkOutAt && r.checkOutAt.getTime() - r.checkInAt.getTime() <= 6 * 3_600_000) { durMs += r.checkOutAt.getTime() - r.checkInAt.getTime(); durN++; }
    }
    return {
      days, from: iso(from), to: iso(today),
      totalVisits: rows.length,
      uniqueMembers: new Set(rows.map((r) => r.memberId)).size,
      avgPerDay: Math.round((rows.length / days) * 10) / 10,
      avgVisitMinutes: durN ? Math.round(durMs / durN / 60_000) : null,
      daily: [...daily].map(([date, count]) => ({ date, count })),
      byHour: hours.map((count, hour) => ({ hour, count })),
    };
  }
}
