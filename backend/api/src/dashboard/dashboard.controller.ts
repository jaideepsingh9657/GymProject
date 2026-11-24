import { Controller, Get } from "@nestjs/common";
import { AuthUser, CurrentUser, RequirePermissions } from "../common/decorators";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @RequirePermissions("dashboard:read") @Get("today")
  today(@CurrentUser() u: AuthUser) { return this.dashboard.today(u); }
}
