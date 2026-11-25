import { Controller, Get, Header, Query } from "@nestjs/common";
import { AuthUser, CurrentUser, RequirePermissions } from "../common/decorators";
import { ExportDto, RangeDto } from "./dto/reports.dto";
import { ReportsService } from "./reports.service";

@Controller("reports")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @RequirePermissions("reports:read") @Get("summary")
  summary(@CurrentUser() u: AuthUser, @Query() q: RangeDto) { return this.reports.summary(u, q.from, q.to); }

  @RequirePermissions("reports:read") @Get("export") @Header("Content-Type", "text/csv; charset=utf-8")
  export(@CurrentUser() u: AuthUser, @Query() q: ExportDto) { return this.reports.export(u, q.type, q.from, q.to); }
}
