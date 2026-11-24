import { Global, Injectable, Module } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface AuditEntry {
  actorId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  ip?: string | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly db: PrismaService) {}

  /** Append-only. Pass `tx` to write inside the caller's transaction. */
  record(e: AuditEntry, tx?: Prisma.TransactionClient) {
    return (tx ?? this.db).auditLog.create({
      data: { actorId: e.actorId ?? null, action: e.action, entity: e.entity, entityId: e.entityId ?? null, before: e.before, after: e.after, ip: e.ip ?? null },
    });
  }
}

@Global()
@Module({ providers: [AuditService], exports: [AuditService] })
export class AuditModule {}
