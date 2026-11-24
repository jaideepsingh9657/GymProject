import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { Env } from "../config/env";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { ConsoleSmsSender, SmsSender } from "./sms.sender";
import { TokenService } from "./token.service";

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService<Env, true>) => ({ secret: cfg.get("JWT_ACCESS_SECRET", { infer: true }), signOptions: { algorithm: "HS256" }, verifyOptions: { algorithms: ["HS256"] } }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService, TokenService,
    {
      provide: SmsSender,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService<Env, true>) => {
        if (cfg.get("NODE_ENV", { infer: true }) === "production") {
          throw new Error("No production SMS provider configured: implement SmsSender before deploying.");
        }
        return new ConsoleSmsSender();
      },
    },
  ],
})
export class AuthModule {}
