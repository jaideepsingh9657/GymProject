import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { branchOf } from "../common/branch";
import { AuthUser } from "../common/decorators";
import { localToday } from "../common/dates";
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
}
