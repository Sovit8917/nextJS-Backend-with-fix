import { IsString, IsNotEmpty, IsMobilePhone, IsEnum, IsOptional, Length, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums';

export class SendOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ enum: Role, default: Role.CUSTOMER })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  otp: string;

  @ApiProperty({ enum: Role, default: Role.CUSTOMER })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;
}

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Admin@123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

/**
 * Used only by the customer website's server-side Better Auth bridge
 * (never called from a browser) — after Better Auth confirms a Google
 * or email/password login and upserts the shared User row, the website's
 * server calls this to get a NestJS-compatible JWT for that same user id.
 * Protected by a shared internal secret header, not a user JWT.
 */
export class SessionTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  userId: string;
}