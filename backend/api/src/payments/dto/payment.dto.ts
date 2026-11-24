import { IsIn, IsInt, IsUUID, Max, Min } from "class-validator";

export class RecordPaymentDto {
  @IsUUID() paymentId: string;
  @IsIn(["CASH", "UPI", "CARD", "ONLINE"]) method: "CASH" | "UPI" | "CARD" | "ONLINE";
  @IsInt() @Min(1) @Max(100_000_000) amountPaise: number;
}
