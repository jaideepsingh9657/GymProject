import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { branchOf } from "../common/branch";
import { AuthUser } from "../common/decorators";
import { addDays, localToday } from "../common/dates";
import { normalizePhone } from "../common/phone";
import { MembersService } from "../members/members.service";
import { PrismaService } from "../prisma/prisma.service";
import { ConvertDto, CreateEnquiryDto, ListEnquiriesDto, ScheduleTrialDto, UpdateEnquiryDto, UpdateTrialDto } from "./dto/enquiry.dto";

const ITEM = {
  id: true, name: true, phone: true, email: true, message: true, goal: true, preferredTime: true, notes: true, isTrialRequest: true,
  source: true, status: true, followUpAt: true, convertedMemberId: true, createdAt: true,
  trials: { orderBy: { scheduledAt: "desc" as const }, take: 3, select: { id: true, scheduledAt: true, status: true, goal: true } },
};
const LIVE = ["NEW", "CONTACTED", "TRIAL_BOOKED"] as const;

@Injectable()
export class EnquiriesService {
  constructor(private readonly db: PrismaService, private readonly audit: AuditService, private readonly members: MembersService) {}

  async list(user: AuthUser, q: ListEnquiriesDto) {
    const branchId = branchOf(user);
    const where: Prisma.EnquiryWhereInput = { branchId };
    if (q.status) where.status = q.status;
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [{ name: { contains: s, mode: "insensitive" } }, { phone: { contains: s.replace(/\D/g, "") || s } }, { email: { contains: s, mode: "insensitive" } }];
    }
    const now = new Date();
    const since30 = addDays(now, -30);
    const endOfToday = new Date(addDays(localToday(), 1).getTime() - 5.5 * 3_600_000); // IST midnight as an instant
    const page = q.page ?? 1, limit = q.limit ?? 20;

    const [total, items, groups, followUpsDue, trialsWeek, leads30, converted30] = await Promise.all([
      this.db.enquiry.count({ where }),
      this.db.enquiry.findMany({ where, select: ITEM, orderBy: [{ createdAt: "desc" }], skip: (page - 1) * limit, take: limit }),
      this.db.enquiry.groupBy({ by: ["status"], where: { branchId }, _count: true }),
      this.db.enquiry.count({ where: { branchId, status: { in: [...LIVE] }, followUpAt: { lte: endOfToday } } }),
      this.db.trialBooking.count({ where: { status: "SCHEDULED", scheduledAt: { gte: now, lte: addDays(now, 7) }, enquiry: { branchId } } }),
      this.db.enquiry.count({ where: { branchId, createdAt: { gte: since30 } } }),
      this.db.enquiry.count({ where: { branchId, createdAt: { gte: since30 }, status: "CONVERTED" } }),
    ]);
    return {
      total, page, limit, items,
      counts: Object.fromEntries(groups.map((g) => [g.status, g._count])),
      summary: { followUpsDue, trialsThisWeek: trialsWeek, leads30d: leads30, converted30d: converted30, conversionRate: leads30 ? Math.round((converted30 / leads30) * 1000) / 10 : 0 },
    };
  }

  async create(user: AuthUser, dto: CreateEnquiryDto) {
    const e = await this.db.enquiry.create({
      data: { branchId: branchOf(user), name: dto.name.trim(), phone: normalizePhone(dto.phone)!, email: dto.email?.toLowerCase(), message: dto.message, source: dto.source ?? "WALKIN", followUpAt: dto.followUpAt ? new Date(dto.followUpAt) : undefined },
      select: ITEM,
    });
    await this.audit.record({ actorId: user.id, action: "enquiry.create", entity: "enquiry", entityId: e.id, after: { source: e.source } });
    return e;
  }

  async update(user: AuthUser, id: string, dto: UpdateEnquiryDto) {
    const before = await this.owned(user, id);
    if (before.status === "CONVERTED") throw new ConflictException("This enquiry has already been converted to a member");
    const e = await this.db.enquiry.update({
      where: { id },
      data: { status: dto.status, notes: dto.notes, ...(dto.followUpAt !== undefined ? { followUpAt: dto.followUpAt ? new Date(dto.followUpAt) : null } : {}) },
      select: ITEM,
    });
    await this.audit.record({ actorId: user.id, action: "enquiry.update", entity: "enquiry", entityId: id, before: { status: before.status }, after: { status: e.status } });
    return e;
  }

  async scheduleTrial(user: AuthUser, id: string, dto: ScheduleTrialDto) {
    const enquiry = await this.owned(user, id);
    if (enquiry.status === "CONVERTED") throw new ConflictException("Already a member");
    const at = new Date(dto.scheduledAt);
    if (at.getTime() < Date.now() - 5 * 60_000) throw new BadRequestException("Trial time can't be in the past");
    await this.db.$transaction(async (tx) => {
      await tx.trialBooking.create({ data: { enquiryId: id, scheduledAt: at, goal: dto.goal ?? enquiry.goal ?? undefined } });
      await tx.enquiry.update({ where: { id }, data: { status: "TRIAL_BOOKED", followUpAt: at } });
      await this.audit.record({ actorId: user.id, action: "trial.schedule", entity: "enquiry", entityId: id, after: { scheduledAt: at.toISOString() } }, tx);
    });
    return this.db.enquiry.findUniqueOrThrow({ where: { id }, select: ITEM });
  }

  async updateTrial(user: AuthUser, id: string, trialId: string, dto: UpdateTrialDto) {
    await this.owned(user, id);
    const t = await this.db.trialBooking.findFirst({ where: { id: trialId, enquiryId: id } });
    if (!t) throw new NotFoundException("Trial not found");
    await this.db.trialBooking.update({ where: { id: trialId }, data: { status: dto.status } });
    await this.audit.record({ actorId: user.id, action: "trial.update", entity: "enquiry", entityId: id, after: { status: dto.status } });
    return this.db.enquiry.findUniqueOrThrow({ where: { id }, select: ITEM });
  }

  /** Turn a lead into a member (or link an existing one) and mark it converted. */
  async convert(user: AuthUser, id: string, dto: ConvertDto) {
    const enquiry = await this.owned(user, id);
    if (enquiry.status === "CONVERTED") throw new ConflictException("Already converted");
    let memberId = dto.memberId;
    if (memberId) {
      const m = await this.db.member.findFirst({ where: { id: memberId, branchId: branchOf(user), deletedAt: null } });
      if (!m) throw new NotFoundException("Member not found");
      const taken = await this.db.enquiry.findFirst({ where: { convertedMemberId: memberId } });
      if (taken) throw new ConflictException("That member is already linked to another enquiry");
    } else {
      memberId = (await this.members.create(user, { name: enquiry.name, phone: enquiry.phone, email: enquiry.email ?? undefined })).id; // 409 if the phone already belongs to a user
    }
    await this.db.enquiry.update({ where: { id }, data: { status: "CONVERTED", convertedMemberId: memberId, followUpAt: null } });
    await this.audit.record({ actorId: user.id, action: "enquiry.convert", entity: "enquiry", entityId: id, after: { memberId } });
    return { memberId, enquiry: await this.db.enquiry.findUniqueOrThrow({ where: { id }, select: ITEM }) };
  }

  private async owned(user: AuthUser, id: string) {
    const e = await this.db.enquiry.findFirst({ where: { id, branchId: branchOf(user) } });
    if (!e) throw new NotFoundException("Enquiry not found");
    return e;
  }
}
