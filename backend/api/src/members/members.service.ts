import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import { AuditService } from "../audit/audit.service";
import { branchOf } from "../common/branch";
import { AuthUser } from "../common/decorators";
import { addDays, localToday, parseDate } from "../common/dates";
import { normalizePhone } from "../common/phone";
import { PrismaService } from "../prisma/prisma.service";
import { CreateMemberDto, ListMembersDto, UpdateMemberDto } from "./dto/member.dto";
import { membershipState } from "./membership-state";

const LIST_SELECT = {
  id: true, memberCode: true, name: true, status: true, joinedOn: true,
  user: { select: { phone: true, email: true } },
  subscriptions: { where: { status: { not: "CANCELLED" as const } }, orderBy: { endDate: "desc" as const }, take: 5, select: { status: true, startDate: true, endDate: true, plan: { select: { name: true } } } },
  payments: { where: { status: { in: ["PENDING", "PARTIAL"] as ("PENDING" | "PARTIAL")[] } }, select: { amountDuePaise: true, amountPaidPaise: true } },
};

@Injectable()
export class MembersService {
  constructor(private readonly db: PrismaService, private readonly audit: AuditService) {}

  async list(user: AuthUser, q: ListMembersDto) {
    const branchId = branchOf(user);
    const today = localToday();
    const where: Prisma.MemberWhereInput = { branchId, deletedAt: null };
    if (q.search) {
      const s = q.search.trim();
      where.OR = [{ name: { contains: s, mode: "insensitive" } }, { memberCode: { contains: s, mode: "insensitive" } }, { user: { phone: { contains: s.replace(/\D/g, "") || s } } }];
    }
    // State filters are derived from subscriptions, so narrow in the DB where possible and finish in memory.
    const rows = await this.db.member.findMany({ where, select: LIST_SELECT, orderBy: { createdAt: "desc" } });
    const shaped = rows.map((m) => {
      const st = membershipState(m.subscriptions, today);
      const dues = m.payments.reduce((a, p) => a + (p.amountDuePaise - p.amountPaidPaise), 0);
      const latest = m.subscriptions[0];
      return { id: m.id, memberCode: m.memberCode, name: m.name, phone: m.user.phone, status: m.status, state: st.state, daysLeft: st.daysLeft ?? null, planName: (st.current ? m.subscriptions.find((s) => s === st.current) : latest)?.plan.name ?? null, endDate: (st.current ?? latest)?.endDate ?? null, duesPaise: dues };
    });
    const filtered = shaped.filter((m) => !q.filter || (q.filter === "DUES" ? m.duesPaise > 0 : m.state === q.filter));
    const page = q.page ?? 1, limit = q.limit ?? 20;
    return { total: filtered.length, page, limit, items: filtered.slice((page - 1) * limit, page * limit) };
  }

  async get(user: AuthUser, id: string) {
    const today = localToday();
    const m = await this.db.member.findFirst({
      where: { id, branchId: branchOf(user), deletedAt: null },
      include: {
        user: { select: { phone: true, email: true } },
        subscriptions: { orderBy: { startDate: "desc" }, take: 20, include: { plan: { select: { name: true } } } },
        payments: { orderBy: { createdAt: "desc" }, take: 20, include: { transactions: { orderBy: { createdAt: "desc" }, select: { method: true, type: true, amountPaise: true, status: true, createdAt: true } } } },
        attendance: { where: { localDate: { gte: addDays(today, -29) } }, orderBy: { localDate: "desc" }, select: { localDate: true, checkInAt: true, checkOutAt: true } },
        assignments: { where: { endsOn: null }, take: 1, include: { trainer: { select: { name: true } } } },
      },
    });
    if (!m) throw new NotFoundException("Member not found");
    const { qrSecret: _omit, ...safe } = m; // never expose the QR signing secret
    const st = membershipState(m.subscriptions, today);
    return { ...safe, state: st.state, daysLeft: st.daysLeft ?? null };
  }

  async create(user: AuthUser, dto: CreateMemberDto) {
    const branchId = branchOf(user);
    const phone = normalizePhone(dto.phone)!;
    const memberRole = await this.db.role.findUniqueOrThrow({ where: { key: "MEMBER" } });
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const member = await this.db.$transaction(async (tx) => {
          const count = await tx.member.count({ where: { branchId } });
          const u = await tx.user.create({ data: { phone, email: dto.email?.toLowerCase(), branchId, roles: { create: { roleId: memberRole.id } } } });
          const created = await tx.member.create({
            data: {
              userId: u.id, branchId, memberCode: `GYM-${String(count + 1 + attempt).padStart(4, "0")}`, name: dto.name.trim(),
              gender: dto.gender ?? "UNSPECIFIED", dateOfBirth: dto.dateOfBirth ? parseDate(dto.dateOfBirth) : undefined, address: dto.address,
              emergencyContactName: dto.emergencyContactName, emergencyContactPhone: dto.emergencyContactPhone ? normalizePhone(dto.emergencyContactPhone) ?? undefined : undefined,
              qrSecret: randomBytes(24).toString("base64url"),
            },
            select: { id: true, memberCode: true, name: true },
          });
          await this.audit.record({ actorId: user.id, action: "member.create", entity: "member", entityId: created.id, after: { name: created.name, memberCode: created.memberCode } }, tx);
          return created;
        });
        return member;
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          const target = String(e.meta?.target ?? "");
          if (target.includes("phone") || target.includes("email")) throw new ConflictException("A user with this phone or email already exists");
          continue; // memberCode collision: retry with the next number
        }
        throw e;
      }
    }
    throw new ConflictException("Could not allocate a member code, please retry");
  }

  async update(user: AuthUser, id: string, dto: UpdateMemberDto) {
    const before = await this.db.member.findFirst({ where: { id, branchId: branchOf(user), deletedAt: null } });
    if (!before) throw new NotFoundException("Member not found");
    if (dto.status === "BLOCKED" && !user.roles.some((r) => r === "OWNER" || r === "ADMIN")) throw new ForbiddenException();
    const { emergencyContactPhone, ...rest } = dto;
    const after = await this.db.member.update({ where: { id }, data: { ...rest, emergencyContactPhone: emergencyContactPhone ? normalizePhone(emergencyContactPhone) ?? undefined : undefined }, select: { id: true, name: true, status: true } });
    await this.audit.record({ actorId: user.id, action: "member.update", entity: "member", entityId: id, before: { name: before.name, status: before.status }, after: { ...dto } });
    return after;
  }
}
