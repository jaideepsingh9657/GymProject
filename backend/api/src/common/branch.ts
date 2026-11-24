import { ForbiddenException } from "@nestjs/common";
import { AuthUser } from "./decorators";

/** All tenant data is scoped to the caller's branch; users without one can't touch it. */
export function branchOf(user: AuthUser): string {
  if (!user.branchId) throw new ForbiddenException("Your account is not assigned to a branch");
  return user.branchId;
}
