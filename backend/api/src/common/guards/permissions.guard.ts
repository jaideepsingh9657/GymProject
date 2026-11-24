import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS } from "../decorators";
import { RbacService } from "../../rbac/rbac.service";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly rbac: RbacService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS, [ctx.getHandler(), ctx.getClass()]);
    if (!required?.length) return true;
    const user = ctx.switchToHttp().getRequest().user;
    if (!user) throw new ForbiddenException();
    const granted = await this.rbac.permissionsFor(user.roles);
    if (!required.every((p) => granted.has(p))) throw new ForbiddenException("Insufficient permissions");
    return true;
  }
}
