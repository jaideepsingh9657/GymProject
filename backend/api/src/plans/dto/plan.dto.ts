import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreatePlanDto {
  @IsString() @IsNotEmpty() @MaxLength(80) name: string;
  @IsInt() @Min(1) @Max(3650) durationDays: number;
  @IsInt() @Min(0) @Max(100_000_000) pricePaise: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdatePlanDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(80) name?: string;
  @IsOptional() @IsInt() @Min(1) @Max(3650) durationDays?: number;
  @IsOptional() @IsInt() @Min(0) @Max(100_000_000) pricePaise?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
