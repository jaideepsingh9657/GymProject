import { IsEmail, IsString, Matches, MaxLength, MinLength } from "class-validator";

const PHONE = /^(?:\+91|91|0)?[\s-]?[6-9](?:[\s-]?\d){9}$/;

export class StaffLoginDto {
  @IsEmail() @MaxLength(254) email: string;
  @IsString() @MinLength(8) @MaxLength(128) password: string;
}

export class OtpRequestDto {
  @Matches(PHONE, { message: "Enter a valid Indian mobile number" }) phone: string;
}

export class OtpVerifyDto {
  @Matches(PHONE, { message: "Enter a valid Indian mobile number" }) phone: string;
  @Matches(/^\d{6}$/, { message: "Code must be 6 digits" }) code: string;
}

export class RefreshDto {
  @IsString() @MinLength(20) @MaxLength(200) refreshToken: string;
}
