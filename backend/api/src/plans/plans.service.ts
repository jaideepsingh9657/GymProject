import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../common/decorators";
import { branchOf } from "../common/branch";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePlanDto, UpdatePlanDto } from "./dto/plan.dto";

@Injectable()
export class PlansService {
  constructor(private readonly db: PrismaService, private readonly audit: AuditService) {}

  list(user: AuthUser) {
    return this.db.membershipPlan.findMany({ where: { branchId: branchOf(user), deletedAt: null }, orderBy: [{ sortOrder: "asc" }, { durationDays: "asc" }] });
  }

  async create(user: AuthUser, dto: CreatePlanDto) {
    const plan = await this.db.membershipPlan.create({ data: { ...dto, branchId: branchOf(user) } });
    await this.audit.record({ actorId: user.id, action: "plan.create", entity: "membership_plan", entityId: plan.id, after: { ...dto } });
    return plan;
  }

  async update(user: AuthUser, id: string, dto: UpdatePlanDto) {
    const before = await this.db.membershipPlan.findFirst({ where: { id, branchId: branchOf(user), deletedAt: null } });
    if (!before) throw new NotFoundException("Plan not found");
    // Existing subscriptions keep their own price snapshot, so editing a price never rewrites history.
    const plan = await this.db.membershipPlan.update({ where: { id }, data: dto });
    await this.audit.record({ actorId: user.id, action: "plan.update", entity: "membership_plan", entityId: id, before: { name: before.name, durationDays: before.durationDays, pricePaise: before.pricePaise, isActive: before.isActive }, after: { ...dto } });
    return plan;
  }
}
