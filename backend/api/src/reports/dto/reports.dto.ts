import { IsIn, IsOptional, Matches } from "class-validator";

export class RangeDto {
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "from must be YYYY-MM-DD" }) from?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "to must be YYYY-MM-DD" }) to?: string;
}

export class ExportDto extends RangeDto {
  @IsIn(["sales", "payments"]) type: "sales" | "payments";
}
