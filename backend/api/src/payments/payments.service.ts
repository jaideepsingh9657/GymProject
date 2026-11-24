import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { branchOf } from "../common/branch";
import { AuthUser } from "../common/decorators";
import { localToday } from "../common/dates";
import { PrismaService } from "../prisma/prisma.service";
import { RecordPaymentDto } from "./dto/payment.dto";
import { nextReceiptNo, paymentStatus } from "./receipt";

@Injectable()
export class PaymentsService {
  constructor(private readonly db: PrismaService, private readonly audit: AuditService) {}

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
