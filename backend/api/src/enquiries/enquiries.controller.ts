import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import { AuthUser, CurrentUser, RequirePermissions } from "../common/decorators";
import { ConvertDto, CreateEnquiryDto, ListEnquiriesDto, ScheduleTrialDto, UpdateEnquiryDto, UpdateTrialDto } from "./dto/enquiry.dto";
import { EnquiriesService } from "./enquiries.service";

@Controller("enquiries")
export class EnquiriesController {
  constructor(private readonly enquiries: EnquiriesService) {}

  @RequirePermissions("enquiries:read") @Get()
  list(@CurrentUser() u: AuthUser, @Query() q: ListEnquiriesDto) { return this.enquiries.list(u, q); }

  @RequirePermissions("enquiries:write") @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateEnquiryDto) { return this.enquiries.create(u, dto); }

  @RequirePermissions("enquiries:write") @Patch(":id")
  update(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateEnquiryDto) { return this.enquiries.update(u, id, dto); }

  @RequirePermissions("enquiries:write") @Post(":id/trial")
  trial(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: ScheduleTrialDto) { return this.enquiries.scheduleTrial(u, id, dto); }

  @RequirePermissions("enquiries:write") @Patch(":id/trials/:trialId")
  updateTrial(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Param("trialId", ParseUUIDPipe) trialId: string, @Body() dto: UpdateTrialDto) { return this.enquiries.updateTrial(u, id, trialId, dto); }

  @RequirePermissions("enquiries:write", "members:write") @HttpCode(200) @Post(":id/convert")
  convert(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: ConvertDto) { return this.enquiries.convert(u, id, dto); }
}
