import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/** Resolves role keys to permission keys, cached briefly in memory. */
@Injectable()
export class RbacService {
  private cache = new Map<string, { perms: Set<string>; at: number }>();
  private readonly ttlMs = 60_000;

  constructor(private readonly db: PrismaService) {}

  async permissionsFor(roles: string[]): Promise<Set<string>> {
    const key = [...roles].sort().join(",");
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < this.ttlMs) return hit.perms;
    const rows = await this.db.rolePermission.findMany({
      where: { role: { key: { in: roles } } },
      select: { permission: { select: { key: true } } },
    });
    const perms = new Set(rows.map((r) => r.permission.key));
    this.cache.set(key, { perms, at: Date.now() });
    return perms;
  }

  clear() { this.cache.clear(); }
}
