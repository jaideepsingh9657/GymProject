import { createParamDecorator, ExecutionContext, SetMetadata } from "@nestjs/common";

export const IS_PUBLIC = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const PERMISSIONS = "permissions";
/** Require ALL listed permissions. Enforced server-side by PermissionsGuard. */
export const RequirePermissions = (...p: string[]) => SetMetadata(PERMISSIONS, p);

export interface AuthUser { id: string; roles: string[]; branchId: string | null; }

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser =>
  ctx.switchToHttp().getRequest().user);
