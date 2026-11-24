import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { branchOf } from "../common/branch";
import { AuthUser } from "../common/decorators";
import { addDays, localToday, parseDate } from "../common/dates";
import { nextReceiptNo, paymentStatus } from "../payments/receipt";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSubscriptionDto } from "./dto/subscription.dto";

const isOverlap = (e: unknown) => String((e as Error)?.message ?? "").includes("no_overlapping_live_subscription");

@Injectable()
export class SubscriptionsService {
  constructor(private readonly db: PrismaService, private readonly audit: AuditService) {}

  /**
   * Sell, renew or extend. One DB transaction: subscription + payment + ledger entry + audit.
   * A renewal while still active starts the day after the current plan ends (no lost days, no overlap).
   * Replaying the same idempotency key returns the original result instead of charging twice.
   */
  async create(user: AuthUser, dto: CreateSubscriptionDto, key: string) {
    const branchId = branchOf(user);
    const replay = await this.db.payment.findUnique({ where: { idempotencyKey: key }, select: { subscriptionId: true } });
    if (replay?.subscriptionId) return { ...(await this.view(replay.subscriptionId)), replayed: true };

    const today = localToday();
    try {
      const id = await this.db.$transaction(async (tx) => {
        const member = await tx.member.findFirst({ where: { id: dto.memberId, branchId, deletedAt: null } });
        if (!member) throw new NotFoundException("Member not found");
        if (member.status === "BLOCKED") throw new BadRequestException("Member is blocked");
        const plan = await tx.membershipPlan.findFirst({ where: { id: dto.planId, branchId, isActive: true, deletedAt: null } });
        if (!plan) throw new NotFoundException("Plan not found or inactive");

        const latest = await tx.memberSubscription.findFirst({ where: { memberId: member.id, status: { in: ["ACTIVE", "FROZEN", "PENDING"] }, endDate: { gte: today } }, orderBy: { endDate: "desc" } });
        const start = dto.startDate ? parseDate(dto.startDate) : latest ? addDays(latest.endDate, 1) : today;
        if (start < today) throw new BadRequestException("Start date can't be in the past");
        const end = addDays(start, plan.durationDays - 1);

        const sub = await tx.memberSubscription.create({
          data: { memberId: member.id, planId: plan.id, startDate: start, endDate: end, status: start <= today ? "ACTIVE" : "PENDING", pricePaiseSnapshot: plan.pricePaise, parentSubscriptionId: latest?.id },
        });

        const paid = dto.payment?.amountPaise ?? 0;
        if (paid > plan.pricePaise) throw new BadRequestException("Payment exceeds the plan price");
        const payment = await tx.payment.create({
          data: { memberId: member.id, subscriptionId: sub.id, amountDuePaise: plan.pricePaise, amountPaidPaise: paid, status: paymentStatus(plan.pricePaise, paid), idempotencyKey: key, receiptNo: paid > 0 ? await nextReceiptNo(tx, today.getUTCFullYear()) : null },
        });
        if (dto.payment) {
          await tx.paymentTransaction.create({ data: { paymentId: payment.id, method: dto.payment.method, amountPaise: paid, status: "SUCCESS", recordedById: user.id } });
        }
        await this.audit.record({ actorId: user.id, action: latest ? "subscription.renew" : "subscription.create", entity: "member_subscription", entityId: sub.id, after: { memberId: member.id, plan: plan.name, start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10), paidPaise: paid } }, tx);
        return sub.id;
      });
      return this.view(id);
    } catch (e) {
      if (isOverlap(e)) throw new ConflictException("That start date overlaps the member's current membership");
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        const again = await this.db.payment.findUnique({ where: { idempotencyKey: key }, select: { subscriptionId: true } });
        if (again?.subscriptionId) return { ...(await this.view(again.subscriptionId)), replayed: true }; // concurrent duplicate
      }
      throw e;
    }
  }

  async cancel(user: AuthUser, id: string, reason: string) {
    const sub = await this.owned(user, id);
    if (sub.status === "CANCELLED") throw new ConflictException("Already cancelled");
    await this.db.memberSubscription.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason } });
    await this.audit.record({ actorId: user.id, action: "subscription.cancel", entity: "member_subscription", entityId: id, before: { status: sub.status }, after: { reason } });
    return this.view(id);
  }

  /** Freezing pauses the clock: unfreeze pushes the end date out by the days actually frozen. */
  async freeze(user: AuthUser, id: string, days: number) {
    const sub = await this.owned(user, id);
    if (sub.status !== "ACTIVE") throw new ConflictException("Only an active membership can be frozen");
    const today = localToday();
    await this.db.memberSubscription.update({ where: { id }, data: { status: "FROZEN", frozenFrom: today, frozenTo: addDays(today, days - 1) } });
    await this.audit.record({ actorId: user.id, action: "subscription.freeze", entity: "member_subscription", entityId: id, after: { days } });
    return this.view(id);
  }

  async unfreeze(user: AuthUser, id: string) {
    const sub = await this.owned(user, id);
    if (sub.status !== "FROZEN" || !sub.frozenFrom) throw new ConflictException("Membership isn't frozen");
    const today = localToday();
    const frozenDays = Math.max(0, Math.round((today.getTime() - sub.frozenFrom.getTime()) / 86_400_000));
    await this.db.memberSubscription.update({ where: { id }, data: { status: "ACTIVE", endDate: addDays(sub.endDate, frozenDays), frozenFrom: null, frozenTo: null } });
    await this.audit.record({ actorId: user.id, action: "subscription.unfreeze", entity: "member_subscription", entityId: id, after: { extendedByDays: frozenDays } });
    return this.view(id);
  }

  private async owned(user: AuthUser, id: string) {
    const sub = await this.db.memberSubscription.findFirst({ where: { id, member: { branchId: branchOf(user) } } });
    if (!sub) throw new NotFoundException("Subscription not found");
    return sub;
  }

  private view(id: string) {
    return this.db.memberSubscription.findUniqueOrThrow({ where: { id }, include: { plan: { select: { name: true } }, payments: { select: { id: true, amountDuePaise: true, amountPaidPaise: true, status: true, receiptNo: true } } } });
  }
}
