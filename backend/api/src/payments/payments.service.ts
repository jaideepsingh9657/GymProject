import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { branchOf } from "../common/branch";
import { AuthUser } from "../common/decorators";
import { localToday } from "../common/dates";
import { PrismaService } from "../prisma/prisma.service";
import { ListPaymentsDto, RecordPaymentDto } from "./dto/payment.dto";
import { nextReceiptNo, paymentStatus } from "./receipt";

@Injectable()
export class PaymentsService {
  constructor(private readonly db: PrismaService, private readonly audit: AuditService) {}

  /** Paged ledger with a summary strip. Month boundaries use the branch-local (IST) calendar. */
  async list(user: AuthUser, q: ListPaymentsDto) {
    const branchId = branchOf(user);
    const where: Prisma.PaymentWhereInput = { member: { branchId, deletedAt: null } };
    if (q.status === "DUE") where.status = { in: ["PENDING", "PARTIAL"] };
    if (q.status === "PAID") where.status = "PAID";
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [{ receiptNo: { contains: s, mode: "insensitive" } }, { member: { name: { contains: s, mode: "insensitive" } } }, { member: { memberCode: { contains: s, mode: "insensitive" } } }];
    }
    const page = q.page ?? 1, limit = q.limit ?? 20;
    const today = localToday();
    const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    // createdAt is a real instant; shift the IST month start back to UTC (+05:30) for the comparison.
    const monthStartInstant = new Date(monthStart.getTime() - 5.5 * 3_600_000);

    const [total, items, open, collected] = await Promise.all([
      this.db.payment.count({ where }),
      this.db.payment.findMany({
        where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit,
        select: { id: true, amountDuePaise: true, amountPaidPaise: true, status: true, receiptNo: true, createdAt: true, member: { select: { id: true, name: true, memberCode: true } }, subscription: { select: { plan: { select: { name: true } } } } },
      }),
      this.db.payment.findMany({ where: { status: { in: ["PENDING", "PARTIAL"] }, member: { branchId } }, select: { amountDuePaise: true, amountPaidPaise: true, memberId: true } }),
      this.db.paymentTransaction.findMany({ where: { status: "SUCCESS", createdAt: { gte: monthStartInstant }, payment: { member: { branchId } } }, select: { type: true, amountPaise: true } }),
    ]);
    return {
      total, page, limit,
      summary: {
        collectedMonthPaise: collected.reduce((a, t) => a + (t.type === "REFUND" ? -t.amountPaise : t.amountPaise), 0),
        outstandingPaise: open.reduce((a, p) => a + (p.amountDuePaise - p.amountPaidPaise), 0),
        membersWithDues: new Set(open.map((p) => p.memberId)).size,
      },
      items: items.map((p) => ({ id: p.id, amountDuePaise: p.amountDuePaise, amountPaidPaise: p.amountPaidPaise, status: p.status, receiptNo: p.receiptNo, createdAt: p.createdAt, member: p.member, planName: p.subscription?.plan.name ?? null })),
    };
  }

  /** Everything needed to print a receipt. */
  async get(user: AuthUser, id: string) {
    const p = await this.db.payment.findFirst({
      where: { id, member: { branchId: branchOf(user) } },
      select: {
        id: true, amountDuePaise: true, amountPaidPaise: true, status: true, receiptNo: true, createdAt: true,
        member: { select: { id: true, name: true, memberCode: true } },
        subscription: { select: { startDate: true, endDate: true, plan: { select: { name: true, durationDays: true } } } },
        transactions: { where: { status: "SUCCESS" }, orderBy: { createdAt: "asc" }, select: { method: true, type: true, amountPaise: true, createdAt: true } },
      },
    });
    if (!p) throw new NotFoundException("Payment not found");
    return p;
  }

  /** Outstanding balances, oldest first. */
  outstanding(user: AuthUser) {
    return this.db.payment.findMany({
      where: { status: { in: ["PENDING", "PARTIAL"] }, member: { branchId: branchOf(user) } },
      orderBy: { createdAt: "asc" }, take: 200,
      select: { id: true, amountDuePaise: true, amountPaidPaise: true, status: true, createdAt: true, member: { select: { id: true, name: true, memberCode: true } } },
    });
  }

  /** Record an offline (cash/UPI/card-machine) payment against an open balance. Online payments go through Razorpay verification instead. */
  async record(user: AuthUser, dto: RecordPaymentDto, key: string) {
    const branchId = branchOf(user);
    const prior = await this.db.paymentTransaction.findFirst({ where: { gatewayOrderId: `idem:${key}` }, select: { paymentId: true } });
    if (prior) return { ...(await this.view(prior.paymentId)), replayed: true };
    if (dto.method === "ONLINE") throw new BadRequestException("Online payments are confirmed by the payment gateway, not recorded manually");

    await this.db.$transaction(async (tx) => {
      // Row lock: two receptionists paying the same balance can't both overpay it.
      await tx.$queryRaw`SELECT id FROM payments WHERE id = ${dto.paymentId}::uuid FOR UPDATE`;
      const p = await tx.payment.findFirst({ where: { id: dto.paymentId, member: { branchId } } });
      if (!p) throw new NotFoundException("Payment not found");
      const remaining = p.amountDuePaise - p.amountPaidPaise;
      if (remaining <= 0) throw new BadRequestException("Nothing outstanding on this payment");
      if (dto.amountPaise > remaining) throw new BadRequestException(`Amount exceeds the outstanding balance of ${remaining} paise`);
      const paid = p.amountPaidPaise + dto.amountPaise;
      await tx.paymentTransaction.create({ data: { paymentId: p.id, method: dto.method, amountPaise: dto.amountPaise, status: "SUCCESS", gatewayOrderId: `idem:${key}`, recordedById: user.id } });
      await tx.payment.update({ where: { id: p.id }, data: { amountPaidPaise: paid, status: paymentStatus(p.amountDuePaise, paid), receiptNo: p.receiptNo ?? (await nextReceiptNo(tx, localToday().getUTCFullYear())) } });
      await this.audit.record({ actorId: user.id, action: "payment.record", entity: "payment", entityId: p.id, after: { method: dto.method, amountPaise: dto.amountPaise } }, tx);
    });
    return this.view(dto.paymentId);
  }

  private view(id: string) {
    return this.db.payment.findUniqueOrThrow({ where: { id }, include: { transactions: { orderBy: { createdAt: "desc" }, select: { method: true, type: true, amountPaise: true, status: true, createdAt: true } } } });
  }
}
