import { Body, Controller, Get, HttpCode, Post, Req } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthUser, CurrentUser, Public } from "../common/decorators";
import { AuthService } from "./auth.service";
import { OtpRequestDto, OtpVerifyDto, RefreshDto, StaffLoginDto } from "./dto/auth.dto";

const meta = (req: any) => ({ userAgent: req.headers["user-agent"], ip: req.ip });

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public() @Throttle({ default: { limit: 5, ttl: 60_000 } }) @HttpCode(200) @Post("staff/login")
  staffLogin(@Body() dto: StaffLoginDto, @Req() req: any) { return this.auth.staffLogin(dto.email, dto.password, meta(req)); }

  @Public() @Throttle({ default: { limit: 3, ttl: 60_000 } }) @HttpCode(202) @Post("otp/request")
  async otpRequest(@Body() dto: OtpRequestDto) { await this.auth.requestOtp(dto.phone); return { message: "If the number is registered, a code has been sent." }; }

  @Public() @Throttle({ default: { limit: 10, ttl: 60_000 } }) @HttpCode(200) @Post("otp/verify")
  otpVerify(@Body() dto: OtpVerifyDto, @Req() req: any) { return this.auth.verifyOtp(dto.phone, dto.code, meta(req)); }

  @Public() @Throttle({ default: { limit: 20, ttl: 60_000 } }) @HttpCode(200) @Post("refresh")
  refresh(@Body() dto: RefreshDto, @Req() req: any) { return this.auth.refresh(dto.refreshToken, meta(req)); }

  @Public() @HttpCode(204) @Post("logout")
  async logout(@Body() dto: RefreshDto) { await this.auth.logout(dto.refreshToken); }

  @Get("me")
  me(@CurrentUser() user: AuthUser) { return this.auth.me(user.id); }
}
