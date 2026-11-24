import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { AuthUser, CurrentUser, RequirePermissions } from "../common/decorators";
import { CreatePlanDto, UpdatePlanDto } from "./dto/plan.dto";
import { PlansService } from "./plans.service";

@Controller("plans")
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  @RequirePermissions("plans:read") @Get()
  list(@CurrentUser() u: AuthUser) { return this.plans.list(u); }

  @RequirePermissions("plans:write") @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreatePlanDto) { return this.plans.create(u, dto); }

  @RequirePermissions("plans:write") @Patch(":id")
  update(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdatePlanDto) { return this.plans.update(u, id, dto); }
}
