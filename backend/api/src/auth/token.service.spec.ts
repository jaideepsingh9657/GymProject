import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { TokenService } from "./token.service";

// Minimal in-memory stand-in for the refresh_tokens table.
function fakeDb() {
  const rows: any[] = [];
  const user = { id: "u1", branchId: null, status: "ACTIVE", deletedAt: null, roles: [{ role: { key: "ADMIN" } }] };
  return {
    rows,
    refreshToken: {
      create: async ({ data }: any) => { const r = { id: `t${rows.length}`, revokedAt: null, ...data }; rows.push(r); return r; },
      findUnique: async ({ where }: any) => { const r = rows.find((x) => x.tokenHash === where.tokenHash); return r && { ...r, user }; },
      updateMany: async ({ where, data }: any) => {
        const m = rows.filter((x) => (where.id ? x.id === where.id : true) && (where.familyId ? x.familyId === where.familyId : true) && (where.tokenHash ? x.tokenHash === where.tokenHash : true) && (where.revokedAt === null ? x.revokedAt === null : true));
        m.forEach((x) => Object.assign(x, data)); return { count: m.length };
      },
    },
  };
}

const cfg = { get: (k: string) => ({ ACCESS_TTL_SECONDS: 900, REFRESH_TTL_DAYS: 30 } as any)[k] };
const make = () => { const db = fakeDb(); return { db, svc: new TokenService(db as any, new JwtService({ secret: "x".repeat(32) }), cfg as any) }; };
const user = { id: "u1", branchId: null };

describe("TokenService refresh rotation", () => {
  it("rotates: old token revoked, new one works", async () => {
    const { svc, db } = make();
    const first = await svc.issue(user, ["ADMIN"], {});
    const second = await svc.rotate(first.refreshToken, {});
    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(db.rows.filter((r) => r.revokedAt).length).toBe(1);
    expect(db.rows[0].familyId).toBe(db.rows[1].familyId);
    await expect(svc.rotate(second.refreshToken, {})).resolves.toBeDefined();
  });

  it("reuse of a rotated token revokes the whole family", async () => {
    const { svc, db } = make();
    const first = await svc.issue(user, ["ADMIN"], {});
    const second = await svc.rotate(first.refreshToken, {});
    await expect(svc.rotate(first.refreshToken, {})).rejects.toThrow(UnauthorizedException);
    expect(db.rows.every((r) => r.revokedAt)).toBe(true);
    await expect(svc.rotate(second.refreshToken, {})).rejects.toThrow(UnauthorizedException);
  });

  it("rejects unknown and expired tokens", async () => {
    const { svc, db } = make();
    await expect(svc.rotate("nope".repeat(10), {})).rejects.toThrow(UnauthorizedException);
    const t = await svc.issue(user, ["ADMIN"], {});
    db.rows[0].expiresAt = new Date(Date.now() - 1000);
    await expect(svc.rotate(t.refreshToken, {})).rejects.toThrow(/expired/i);
  });

  it("logout revokes", async () => {
    const { svc } = make();
    const t = await svc.issue(user, ["ADMIN"], {});
    await svc.revoke(t.refreshToken);
    await expect(svc.rotate(t.refreshToken, {})).rejects.toThrow(UnauthorizedException);
  });
});
