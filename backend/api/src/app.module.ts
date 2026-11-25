import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";
import { AuditModule } from "./audit/audit.service";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { PermissionsGuard } from "./common/guards/permissions.guard";
import { validateEnv } from "./config/env";
import { HealthController } from "./health/health.controller";
import { PrismaModule } from "./prisma/prisma.service";
import { EnquiriesController } from "./enquiries/enquiries.controller";
import { EnquiriesService } from "./enquiries/enquiries.service";
import { PublicController, PublicService } from "./public/public.controller";
import { RbacModule } from "./rbac/rbac.module";
import { AttendanceController } from "./attendance/attendance.controller";
import { AttendanceService } from "./attendance/attendance.service";
import { DashboardController } from "./dashboard/dashboard.controller";
import { DashboardService } from "./dashboard/dashboard.service";
import { MembersController } from "./members/members.controller";
import { MembersService } from "./members/members.service";
import { PaymentsController } from "./payments/payments.controller";
import { PaymentsService } from "./payments/payments.service";
import { PlansController } from "./plans/plans.controller";
import { PlansService } from "./plans/plans.service";
import { SubscriptionsController } from "./subscriptions/subscriptions.controller";
import { SubscriptionsService } from "./subscriptions/subscriptions.service";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LoggerModule.forRoot({
      pinoHttp: {
        redact: ["req.headers.authorization", "req.headers.cookie", "req.body.password", "req.body.refreshToken", "req.body.code"],
        genReqId: (req) => (req.headers["x-request-id"] as string) ?? crypto.randomUUID(),
        autoLogging: { ignore: (req) => req.url?.endsWith("/health") ?? false },
      },
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
      // Test-only escape hatch; never set outside NODE_ENV=test (see throttle.e2e-spec.ts for the real limits).
      skipIf: () => process.env.NODE_ENV === "test" && process.env.DISABLE_THROTTLE === "1",
    }),
    PrismaModule, AuditModule, RbacModule, AuthModule,
  ],
  controllers: [HealthController, PlansController, MembersController, SubscriptionsController, PaymentsController, AttendanceController, DashboardController, EnquiriesController, PublicController],
  providers: [
    PlansService, MembersService, SubscriptionsService, PaymentsService, AttendanceService, DashboardService, EnquiriesService, PublicService,
    // Order matters: rate-limit, then authenticate, then authorize.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
