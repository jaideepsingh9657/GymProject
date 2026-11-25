import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import * as argon2 from "argon2";
import { AuditService } from "../audit/audit.service";
import { branchOf } from "../common/branch";
import { AuthUser } from "../common/decorators";
import { localToday } from "../common/dates";
import { normalizePhone } from "../common/phone";
import { PrismaService } from "../prisma/prisma.service";
import { AssignMemberDto, CreateTrainerDto, UpdateTrainerDto } from "./dto/trainer.dto";

const SELECT = {
  id: true, name: true, qualifications: true, specializations: true, experienceYears: true, bio: true, availability: true, isPublic: true, createdAt: true,
  user: { select: { email: true, phone: true, status: true, lastLoginAt: true } },
};
type Row = Prisma.TrainerGetPayload<{ select: typeof SELECT }>;

/** Blank form fields arrive as "": store them as null so consumers can tell "not provided". */
const blank = (v: string | undefined) => (v === undefined ? undefined : v.trim() === "" ? null : v.trim());

const shape = (t: Row, memberCount = 0) => ({
  id: t.id, name: t.name, email: t.user.email, phone: t.user.phone, qualifications: t.qualifications, specializations: t.specializations,
  experienceYears: t.experienceYears, bio: t.bio, availability: (t.availability as { note?: string } | null)?.note ?? null,
  isPublic: t.isPublic, isActive: t.user.status === "ACTIVE", lastLoginAt: t.user.lastLoginAt, memberCount,
});

@Injectable()
export class TrainersService {
  constructor(private readonly db: PrismaService, private readonly audit: AuditService) {}

  async list(user: AuthUser) {
    const rows = await this.db.trainer.findMany({ where: { deletedAt: null, user: { branchId: branchOf(user), deletedAt: null } }, select: SELECT, orderBy: { name: "asc" } });
    const counts = await this.db.trainerAssignment.groupBy({ by: ["trainerId"], where: { endsOn: null, trainerId: { in: rows.map((r) => r.id) } }, _count: true });
    const byTrainer = new Map(counts.map((c) => [c.trainerId, c._count]));
    return rows.map((t) => shape(t, byTrainer.get(t.id) ?? 0));
  }

  async get(user: AuthUser, id: string) {
    const t = await this.owned(user, id);
    const members = await this.db.trainerAssignment.findMany({
      where: { trainerId: id, endsOn: null }, orderBy: { startsOn: "desc" },
      select: { id: true, startsOn: true, member: { select: { id: true, name: true, memberCode: true } } },
    });
    return { ...shape(t, members.length), members };
  }

  async create(user: AuthUser, dto: CreateTrainerDto) {
    const branchId = branchOf(user);
    const email = dto.email.toLowerCase();
    const phone = dto.phone ? normalizePhone(dto.phone)! : undefined;
    const role = await this.db.role.findUniqueOrThrow({ where: { key: "TRAINER" } });
    const passwordHash = await argon2.hash(dto.password);
    try {
      const id = await this.db.$transaction(async (tx) => {
        const u = await tx.user.create({ data: { email, phone, passwordHash, branchId, roles: { create: { roleId: role.id } } } });
        const t = await tx.trainer.create({
          data: { userId: u.id, name: dto.name.trim(), qualifications: blank(dto.qualifications), specializations: dto.specializations ?? [], experienceYears: dto.experienceYears, bio: blank(dto.bio), availability: dto.availability ? { note: dto.availability } : undefined, isPublic: dto.isPublic ?? true },
        });
        await this.audit.record({ actorId: user.id, action: "trainer.create", entity: "trainer", entityId: t.id, after: { name: t.name, email } }, tx);
        return t.id;
      });
      return this.get(user, id);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new ConflictException("A user with this email or phone already exists");
      throw e;
    }
  }

  async update(user: AuthUser, id: string, dto: UpdateTrainerDto) {
    const t = await this.owned(user, id);
    const { isActive, newPassword, availability, qualifications, bio, ...rest } = dto;
    const profile = { ...rest, ...(qualifications !== undefined ? { qualifications: blank(qualifications) } : {}), ...(bio !== undefined ? { bio: blank(bio) } : {}) };
    await this.db.$transaction(async (tx) => {
      await tx.trainer.update({ where: { id }, data: { ...profile, ...(availability !== undefined ? { availability: availability ? { note: availability } : Prisma.JsonNull } : {}) } });
      if (isActive !== undefined || newPassword) {
        await tx.user.update({ where: { id: t.userId }, data: { ...(isActive !== undefined ? { status: isActive ? "ACTIVE" : "SUSPENDED" } : {}), ...(newPassword ? { passwordHash: await argon2.hash(newPassword) } : {}) } });
        // Deactivating or resetting a password signs the trainer out everywhere.
        if (isActive === false || newPassword) await tx.refreshToken.updateMany({ where: { userId: t.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      }
      await this.audit.record({ actorId: user.id, action: "trainer.update", entity: "trainer", entityId: id, after: { ...profile, availability, isActive, passwordReset: !!newPassword } as Prisma.InputJsonValue }, tx);
    });
    return this.get(user, id);
  }

  /** A member has one trainer at a time: assigning moves them from any previous trainer. */
  async assign(user: AuthUser, trainerId: string, dto: AssignMemberDto) {
    const branchId = branchOf(user);
    const trainer = await this.owned(user, trainerId);
    if (trainer.user.status !== "ACTIVE") throw new ConflictException("This trainer is deactivated");
    const member = await this.db.member.findFirst({ where: { id: dto.memberId, branchId, deletedAt: null }, select: { id: true, name: true } });
    if (!member) throw new NotFoundException("Member not found");
    const today = localToday();

    await this.db.$transaction(async (tx) => {
      const current = await tx.trainerAssignment.findFirst({ where: { memberId: member.id, endsOn: null } });
      if (current?.trainerId === trainerId) throw new ConflictException(`${member.name} is already assigned to this trainer`);
      if (current) await tx.trainerAssignment.update({ where: { id: current.id }, data: { endsOn: today } });
      await tx.trainerAssignment.create({ data: { trainerId, memberId: member.id, startsOn: today } });
      await this.audit.record({ actorId: user.id, action: "trainer.assign", entity: "trainer", entityId: trainerId, after: { memberId: member.id, movedFrom: current?.trainerId ?? null } }, tx);
    });
    return this.get(user, trainerId);
  }

  async endAssignment(user: AuthUser, trainerId: string, assignmentId: string) {
    await this.owned(user, trainerId);
    const a = await this.db.trainerAssignment.findFirst({ where: { id: assignmentId, trainerId, endsOn: null } });
    if (!a) throw new NotFoundException("Active assignment not found");
    await this.db.trainerAssignment.update({ where: { id: assignmentId }, data: { endsOn: localToday() } });
    await this.audit.record({ actorId: user.id, action: "trainer.unassign", entity: "trainer", entityId: trainerId, after: { memberId: a.memberId } });
    return this.get(user, trainerId);
  }

  private async owned(user: AuthUser, id: string) {
    const t = await this.db.trainer.findFirst({ where: { id, deletedAt: null, user: { branchId: branchOf(user) } }, select: { ...SELECT, userId: true } });
    if (!t) throw new NotFoundException("Trainer not found");
    return t;
  }
}
