import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Post, Query } from "@nestjs/common";
import { AuthUser, CurrentUser, RequirePermissions } from "../common/decorators";
import { requireIdempotencyKey } from "../common/idempotency";
import { ListPaymentsDto, RecordPaymentDto } from "./dto/payment.dto";
import { PaymentsService } from "./payments.service";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @RequirePermissions("payments:read") @Get()
  list(@CurrentUser() u: AuthUser, @Query() q: ListPaymentsDto) { return this.payments.list(u, q); }

  @RequirePermissions("payments:read") @Get("outstanding")
  outstanding(@CurrentUser() u: AuthUser) { return this.payments.outstanding(u); }

  @RequirePermissions("payments:read") @Get(":id")
  get(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string) { return this.payments.get(u, id); }

  @RequirePermissions("payments:write") @Post()
  record(@CurrentUser() u: AuthUser, @Body() dto: RecordPaymentDto, @Headers() h: Record<string, unknown>) { return this.payments.record(u, dto, requireIdempotencyKey(h)); }
}
