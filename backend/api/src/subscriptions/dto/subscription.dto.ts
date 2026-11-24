import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, ValidateNested } from "class-validator";

export class InitialPaymentDto {
  @IsIn(["CASH", "UPI", "CARD", "ONLINE"]) method: "CASH" | "UPI" | "CARD" | "ONLINE";
  @IsInt() @Min(1) @Max(100_000_000) amountPaise: number;
}

export class CreateSubscriptionDto {
  @IsUUID() memberId: string;
  @IsUUID() planId: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) startDate?: string;
  @IsOptional() @ValidateNested() @Type(() => InitialPaymentDto) payment?: InitialPaymentDto;
}

export class CancelSubscriptionDto {
  @IsString() @MaxLength(200) reason: string;
}

export class FreezeSubscriptionDto {
  @IsInt() @Min(1) @Max(90) days: number;
}
