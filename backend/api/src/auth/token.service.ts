import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomBytes, randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { Env } from "../config/env";

export interface SessionMeta { userAgent?: string; ip?: string }
export interface TokenPair { accessToken: string; refreshToken: string; expiresIn: number }

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

@Injectable()
export class TokenService {
  constructor(private readonly db: PrismaService, private readonly jwt: JwtService, private readonly cfg: ConfigService<Env, true>) {}

  async issue(user: { id: string; branchId: string | null }, roles: string[], meta: SessionMeta, familyId: string = randomUUID()): Promise<TokenPair> {
    const ttl = this.cfg.get("ACCESS_TTL_SECONDS", { infer: true });
    const accessToken = await this.jwt.signAsync({ sub: user.id, roles, branchId: user.branchId }, { expiresIn: ttl });
    const refreshToken = randomBytes(48).toString("base64url");
    await this.db.refreshToken.create({
      data: {
        userId: user.id, familyId, tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + this.cfg.get("REFRESH_TTL_DAYS", { infer: true }) * 86_400_000),
        userAgent: meta.userAgent?.slice(0, 300), ip: meta.ip,
      },
    });
    return { accessToken, refreshToken, expiresIn: ttl };
  }

  /**
   * Rotating refresh. Presenting an already-used token means it was stolen or
   * replayed, so the entire family is revoked and the user must sign in again.
   */
  async rotate(presented: string, meta: SessionMeta): Promise<TokenPair> {
    const row = await this.db.refreshToken.findUnique({
      where: { tokenHash: sha256(presented) },
      include: { user: { include: { roles: { include: { role: true } } } } },
    });
    if (!row) throw new UnauthorizedException("Invalid refresh token");

    if (row.revokedAt) {
      await this.revokeFamily(row.familyId);
      throw new UnauthorizedException("Refresh token reuse detected");
    }
    if (row.expiresAt <= new Date() || row.user.status !== "ACTIVE" || row.user.deletedAt) {
      throw new UnauthorizedException("Session expired");
    }

    // Atomic claim: only one concurrent caller can flip revokedAt from null.
    const claimed = await this.db.refreshToken.updateMany({ where: { id: row.id, revokedAt: null }, data: { revokedAt: new Date() } });
    if (claimed.count === 0) {
      await this.revokeFamily(row.familyId);
      throw new UnauthorizedException("Refresh token reuse detected");
    }
    return this.issue(row.user, row.user.roles.map((r) => r.role.key), meta, row.familyId);
  }

  async revoke(presented: string) {
    await this.db.refreshToken.updateMany({ where: { tokenHash: sha256(presented), revokedAt: null }, data: { revokedAt: new Date() } });
  }

  revokeFamily(familyId: string) {
    return this.db.refreshToken.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: new Date() } });
  }
}
