import { Transform } from "class-transformer";
import { IsEmail, IsEnum, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from "class-validator";

const PHONE = /^(?:\+91|91|0)?[\s-]?[6-9](?:[\s-]?\d){9}$/;
const GENDERS = ["MALE", "FEMALE", "OTHER", "UNSPECIFIED"] as const;

export class CreateMemberDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @Matches(PHONE, { message: "Enter a valid Indian mobile number" }) phone: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsIn(GENDERS) gender?: (typeof GENDERS)[number];
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) dateOfBirth?: string;
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsOptional() @IsString() @MaxLength(100) emergencyContactName?: string;
  @IsOptional() @Matches(PHONE) emergencyContactPhone?: string;
}

export class UpdateMemberDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) name?: string;
  @IsOptional() @IsIn(GENDERS) gender?: (typeof GENDERS)[number];
  @IsOptional() @IsString() @MaxLength(300) address?: string;
  @IsOptional() @IsString() @MaxLength(100) emergencyContactName?: string;
  @IsOptional() @Matches(PHONE) emergencyContactPhone?: string;
  @IsOptional() @IsIn(["ACTIVE", "INACTIVE", "BLOCKED"]) status?: "ACTIVE" | "INACTIVE" | "BLOCKED";
}

export class ListMembersDto {
  @IsOptional() @IsString() @MaxLength(60) search?: string;
  @IsOptional() @IsIn(["ACTIVE", "EXPIRING", "EXPIRED", "DUES", "NONE"]) filter?: string;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) @Max(100) limit?: number = 20;
}
