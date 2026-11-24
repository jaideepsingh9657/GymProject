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
import { RbacModule } from "./rbac/rbac.module";

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
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule, AuditModule, RbacModule, AuthModule,
  ],
  controllers: [HealthController],
  providers: [
    // Order matters: rate-limit, then authenticate, then authorize.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
