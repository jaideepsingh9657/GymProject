import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { IS_PUBLIC } from "../decorators";
import { PrismaService } from "../../prisma/prisma.service";

/** Global guard: every route needs a valid access token unless marked @Public(). */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly jwt: JwtService, private readonly db: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()])) return true;
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new UnauthorizedException("Missing bearer token");
    let payload: { sub: string; roles: string[]; branchId: string | null };
    try {
      payload = await this.jwt.verifyAsync(header.slice(7));
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
    // Suspension / deletion takes effect immediately, not at token expiry.
    const user = await this.db.user.findFirst({ where: { id: payload.sub, deletedAt: null, status: "ACTIVE" }, select: { id: true } });
    if (!user) throw new UnauthorizedException("Account unavailable");
    req.user = { id: payload.sub, roles: payload.roles, branchId: payload.branchId };
    return true;
  }
}
