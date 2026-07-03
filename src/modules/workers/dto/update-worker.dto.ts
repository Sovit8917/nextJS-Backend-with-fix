import { IsString, IsOptional, IsEmail, IsNumber, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateWorkerDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() email?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() avatar?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bio?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() experience?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() serviceRadius?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() language?: string;
}
