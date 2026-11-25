import { Transform } from "class-transformer";
import { ArrayMaxSize, IsArray, IsBoolean, IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength } from "class-validator";

const PHONE = /^(?:\+91|91|0)?[\s-]?[6-9](?:[\s-]?\d){9}$/;
const clean = ({ value }: { value: unknown }) => (Array.isArray(value) ? value.map((v) => String(v).trim()).filter(Boolean) : value);

export class CreateTrainerDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @IsEmail() @MaxLength(254) email: string;
  @IsOptional() @Matches(PHONE, { message: "Enter a valid Indian mobile number" }) phone?: string;
  /** Initial password for the trainer's staff login; they should change it. */
  @IsString() @MinLength(10) @MaxLength(128) password: string;
  @IsOptional() @IsString() @MaxLength(300) qualifications?: string;
  @IsOptional() @Transform(clean) @IsArray() @ArrayMaxSize(12) @IsString({ each: true }) @MaxLength(40, { each: true }) specializations?: string[];
  @IsOptional() @IsInt() @Min(0) @Max(60) experienceYears?: number;
  @IsOptional() @IsString() @MaxLength(1500) bio?: string;
  @IsOptional() @IsString() @MaxLength(200) availability?: string;
  @IsOptional() @IsBoolean() isPublic?: boolean;
}

export class UpdateTrainerDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(300) qualifications?: string;
  @IsOptional() @Transform(clean) @IsArray() @ArrayMaxSize(12) @IsString({ each: true }) @MaxLength(40, { each: true }) specializations?: string[];
  @IsOptional() @IsInt() @Min(0) @Max(60) experienceYears?: number;
  @IsOptional() @IsString() @MaxLength(1500) bio?: string;
  @IsOptional() @IsString() @MaxLength(200) availability?: string;
  @IsOptional() @IsBoolean() isPublic?: boolean;
  /** false suspends the login immediately and signs the trainer out everywhere. */
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() @MinLength(10) @MaxLength(128) newPassword?: string;
}

export class AssignMemberDto {
  @IsUUID() memberId: string;
}
