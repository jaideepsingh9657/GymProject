import { Body, Controller, Headers, HttpCode, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { AuthUser, CurrentUser, RequirePermissions } from "../common/decorators";
import { requireIdempotencyKey } from "../common/idempotency";
import { CancelSubscriptionDto, CreateSubscriptionDto, FreezeSubscriptionDto } from "./dto/subscription.dto";
import { SubscriptionsService } from "./subscriptions.service";

@Controller("subscriptions")
export class SubscriptionsController {
  constructor(private readonly subs: SubscriptionsService) {}

  @RequirePermissions("subscriptions:write") @Post()
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateSubscriptionDto, @Headers() h: Record<string, unknown>) { return this.subs.create(u, dto, requireIdempotencyKey(h)); }

  @RequirePermissions("subscriptions:write") @HttpCode(200) @Post(":id/cancel")
  cancel(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: CancelSubscriptionDto) { return this.subs.cancel(u, id, dto.reason); }

  @RequirePermissions("subscriptions:write") @HttpCode(200) @Post(":id/freeze")
  freeze(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string, @Body() dto: FreezeSubscriptionDto) { return this.subs.freeze(u, id, dto.days); }

  @RequirePermissions("subscriptions:write") @HttpCode(200) @Post(":id/unfreeze")
  unfreeze(@CurrentUser() u: AuthUser, @Param("id", ParseUUIDPipe) id: string) { return this.subs.unfreeze(u, id); }
}
