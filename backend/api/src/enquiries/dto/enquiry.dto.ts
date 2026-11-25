import { Transform, Type } from "class-transformer";
import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from "class-validator";

const PHONE = /^(?:\+91|91|0)?[\s-]?[6-9](?:[\s-]?\d){9}$/;
const OPEN = ["NEW", "CONTACTED", "TRIAL_BOOKED", "CONVERTED", "LOST"] as const;

export class PublicEnquiryDto {
  @IsString() @MinLength(2) @MaxLength(100) name: string;
  @Matches(PHONE, { message: "Enter a valid Indian mobile number" }) phone: string;
  @IsOptional() @IsString() @MaxLength(254) email?: string;
  @IsOptional() @IsString() @MaxLength(1000) message?: string;
  @IsOptional() @IsString() @MaxLength(60) goal?: string;
  @IsOptional() @IsString() @MaxLength(30) preferredTime?: string;
  @IsOptional() @IsIn(["ENQUIRY", "TRIAL"]) kind?: "ENQUIRY" | "TRIAL";
  /** Honeypot: real visitors never see or fill this field. */
  @IsOptional() @IsString() @MaxLength(200) company?: string;
}

export class CreateEnquiryDto {
  @IsString() @MinLength(2) @MaxLength(100) name: string;
  @Matches(PHONE, { message: "Enter a valid Indian mobile number" }) phone: string;
  @IsOptional() @IsString() @MaxLength(254) email?: string;
  @IsOptional() @IsString() @MaxLength(1000) message?: string;
  @IsOptional() @IsIn(["WHATSAPP", "WALKIN", "OTHER"]) source?: "WHATSAPP" | "WALKIN" | "OTHER";
  @IsOptional() @IsDateString() followUpAt?: string;
}

export class UpdateEnquiryDto {
  @IsOptional() @IsIn(["NEW", "CONTACTED", "TRIAL_BOOKED", "LOST"]) status?: "NEW" | "CONTACTED" | "TRIAL_BOOKED" | "LOST";
  @IsOptional() @IsDateString() followUpAt?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class ListEnquiriesDto {
  @IsOptional() @IsIn(OPEN) status?: (typeof OPEN)[number];
  @IsOptional() @IsString() @MaxLength(60) search?: string;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) @Max(100) limit?: number = 20;
}

export class ScheduleTrialDto {
  @IsDateString() scheduledAt: string;
  @IsOptional() @IsString() @MaxLength(60) goal?: string;
}

export class UpdateTrialDto {
  @IsIn(["SCHEDULED", "ATTENDED", "NO_SHOW", "CANCELLED"]) status: "SCHEDULED" | "ATTENDED" | "NO_SHOW" | "CANCELLED";
}

export class ConvertDto {
  /** Link an existing member instead of creating a new one. */
  @IsOptional() @IsUUID() memberId?: string;
}
