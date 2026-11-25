import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { AuthUser, CurrentUser, RequirePermissions } from "../common/decorators";
import { AttendanceService } from "./attendance.service";
import { CheckInDto, ListAttendanceDto, ReportDto } from "./dto/attendance.dto";

@Controller("attendance")
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @RequirePermissions("attendance:write") @HttpCode(201) @Post("check-in")
  checkIn(@CurrentUser() u: AuthUser, @Body() dto: CheckInDto) { return this.attendance.checkIn(u, dto.memberCode); }

  @RequirePermissions("attendance:write") @HttpCode(200) @Post(":id/check-out")
  checkOut(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string) { return this.attendance.checkOut(u, id); }

  @RequirePermissions("attendance:read") @Get()
  day(@CurrentUser() u: AuthUser, @Query() q: ListAttendanceDto) { return this.attendance.day(u, q.date); }

  @RequirePermissions("attendance:read") @Get("report")
  report(@CurrentUser() u: AuthUser, @Query() q: ReportDto) { return this.attendance.report(u, q.days); }

  @RequirePermissions("attendance:read") @Get("today")
  today(@CurrentUser() u: AuthUser) { return this.attendance.today(u); }
}
