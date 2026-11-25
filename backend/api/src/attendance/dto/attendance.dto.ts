import { Transform } from "class-transformer";
import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, MaxLength, Min } from "class-validator";

export class CheckInDto {
  @IsString() @IsNotEmpty() @MaxLength(40) memberCode: string;
}

export class ListAttendanceDto {
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "date must be YYYY-MM-DD" }) date?: string;
}

export class ReportDto {
  @IsOptional() @Transform(({ value }) => Number(value)) @IsInt() @Min(7) @Max(90) days?: number = 30;
}
