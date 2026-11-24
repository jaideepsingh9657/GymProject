import { BadRequestException, HttpException, HttpStatus, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as argon2 from "argon2";
import { AuditService } from "../audit/audit.service";
import { Env } from "../config/env";
import { normalizePhone } from "../common/phone";
import { PrismaService } from "../prisma/prisma.service";
import { generateOtp, hashOtp, otpMatches } from "./otp";
import { SmsSender } from "./sms.sender";
import { SessionMeta, TokenPair, TokenService } from "./token.service";

const STAFF_ROLES = ["OWNER", "ADMIN", "TRAINER"];
const MAX_OTP_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 60_000;

@Injectable()
export class AuthService {
  private readonly log = new Logger(AuthService.name);
  private dummyHash?: Promise<string>;

  constructor(
    private readonly db: PrismaService,
    private readonly tokens: TokenService,
    private readonly sms: SmsSender,
    private readonly audit: AuditService,
    private readonly cfg: ConfigService<Env, true>,
  ) {}

  async staffLogin(email: string, password: string, meta: SessionMeta): Promise<TokenPair> {
    const user = await this.db.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
      include: { roles: { include: { role: true } } },
    });
    // Verify against a dummy hash when the user is unknown so timing doesn't reveal which emails exist.
    const hash = user?.passwordHash ?? (await (this.dummyHash ??= argon2.hash("not-a-real-password")));
    const ok = await argon2.verify(hash, password).catch(() => false);
    const roles = user?.roles.map((r) => r.role.key) ?? [];

    if (!user || !ok || user.status !== "ACTIVE" || !roles.some((r) => STAFF_ROLES.includes(r))) {
      await this.audit.record({ action: "auth.staff_login_failed", entity: "user", entityId: user?.id, ip: meta.ip });
      throw new UnauthorizedException("Invalid email or password");
    }
    await this.db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.audit.record({ actorId: user.id, action: "auth.staff_login", entity: "user", entityId: user.id, ip: meta.ip });
    return this.tokens.issue(user, roles, meta);
  }

  /** Always resolves the same way so callers can't probe which numbers are registered. */
  async requestOtp(phoneInput: string): Promise<void> {
    const phone = this.requirePhone(phoneInput);
    const recent = await this.db.otpCode.findFirst({ where: { target: phone }, orderBy: { createdAt: "desc" } });
    if (recent && Date.now() - recent.createdAt.getTime() < OTP_RESEND_COOLDOWN_MS) {
      throw new HttpException("Please wait before requesting another code", HttpStatus.TOO_MANY_REQUESTS);
    }
    const user = await this.db.user.findFirst({ where: { phone, deletedAt: null, status: "ACTIVE" }, select: { id: true } });
    if (!user) return; // silent: no SMS, same response
    const code = generateOtp();
    await this.db.otpCode.create({
      data: {
        target: phone,
        codeHash: hashOtp(this.cfg.get("OTP_SECRET", { infer: true }), phone, code),
        expiresAt: new Date(Date.now() + this.cfg.get("OTP_TTL_SECONDS", { infer: true }) * 1000),
      },
    });
    await this.sms.send(phone, `Your Luxury Fitness Gym code is ${code}. It expires in ${Math.round(this.cfg.get("OTP_TTL_SECONDS", { infer: true }) / 60)} minutes.`);
  }

  async verifyOtp(phoneInput: string, code: string, meta: SessionMeta): Promise<TokenPair> {
    const phone = this.requirePhone(phoneInput);
    const otp = await this.db.otpCode.findFirst({
      where: { target: phone, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!otp || otp.attempts >= MAX_OTP_ATTEMPTS) throw new UnauthorizedException("Invalid or expired code");

    if (!otpMatches(this.cfg.get("OTP_SECRET", { infer: true }), phone, code, otp.codeHash)) {
      await this.db.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw new UnauthorizedException("Invalid or expired code");
    }
    // Single use: only one concurrent verify can consume it.
    const consumed = await this.db.otpCode.updateMany({ where: { id: otp.id, consumedAt: null }, data: { consumedAt: new Date() } });
    if (consumed.count === 0) throw new UnauthorizedException("Invalid or expired code");

    const user = await this.db.user.findFirst({
      where: { phone, deletedAt: null, status: "ACTIVE" },
      include: { roles: { include: { role: true } } },
    });
    if (!user) throw new UnauthorizedException("Invalid or expired code");
    await this.db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.tokens.issue(user, user.roles.map((r) => r.role.key), meta);
  }

  refresh(token: string, meta: SessionMeta) { return this.tokens.rotate(token, meta); }
  logout(token: string) { return this.tokens.revoke(token); }

  async me(userId: string) {
    const u = await this.db.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, phone: true, branchId: true, roles: { select: { role: { select: { key: true } } } } },
    });
    return { id: u.id, email: u.email, phone: u.phone, branchId: u.branchId, roles: u.roles.map((r) => r.role.key) };
  }

  private requirePhone(input: string): string {
    const p = normalizePhone(input);
    if (!p) throw new BadRequestException("Enter a valid Indian mobile number");
    return p;
  }
}
