import { Transform } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from "class-validator";

export class RecordPaymentDto {
  @IsUUID() paymentId: string;
  @IsIn(["CASH", "UPI", "CARD", "ONLINE"]) method: "CASH" | "UPI" | "CARD" | "ONLINE";
  @IsInt() @Min(1) @Max(100_000_000) amountPaise: number;
}

export class ListPaymentsDto {
  @IsOptional() @IsIn(["ALL", "DUE", "PAID"]) status?: "ALL" | "DUE" | "PAID" = "ALL";
  @IsOptional() @IsString() @MaxLength(60) search?: string;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(1) @Max(100) limit?: number = 20;
}
