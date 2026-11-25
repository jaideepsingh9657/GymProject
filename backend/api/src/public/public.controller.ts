import { Body, Controller, HttpCode, Injectable, Post, Req } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../common/decorators";
import { normalizePhone } from "../common/phone";
import { PublicEnquiryDto } from "../enquiries/dto/enquiry.dto";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PublicService {
  constructor(private readonly db: PrismaService) {}

  /** Anonymous lead capture from the website. Always answers the same way so bots learn nothing. */
  async enquiry(dto: PublicEnquiryDto, ip?: string) {
    if (dto.company) return; // honeypot filled: a bot. Pretend success, store nothing.
    const phone = normalizePhone(dto.phone)!;
    const branch = await this.db.gymBranch.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" }, select: { id: true } });
    if (!branch) return;
    // Same number re-submitting within a day is one lead, not five.
    const dup = await this.db.enquiry.findFirst({ where: { branchId: branch.id, phone, status: { in: ["NEW", "CONTACTED", "TRIAL_BOOKED"] }, createdAt: { gt: new Date(Date.now() - 86_400_000) } }, select: { id: true } });
    if (dup) return;
    const e = await this.db.enquiry.create({
      data: { branchId: branch.id, name: dto.name.trim(), phone, email: dto.email?.toLowerCase().slice(0, 254), message: dto.message, goal: dto.goal, preferredTime: dto.preferredTime, isTrialRequest: dto.kind === "TRIAL", source: "WEBSITE", followUpAt: new Date() },
    });
    await this.db.auditLog.create({ data: { action: "enquiry.public_create", entity: "enquiry", entityId: e.id, ip: ip ?? null } });
  }
}

@Controller("public")
export class PublicController {
  constructor(private readonly svc: PublicService) {}

  @Public() @Throttle({ default: { limit: 5, ttl: 60_000 } }) @HttpCode(202) @Post("enquiries")
  async enquiry(@Body() dto: PublicEnquiryDto, @Req() req: any) {
    await this.svc.enquiry(dto, req.ip);
    return { message: "Thanks, we'll be in touch shortly." };
  }
}
