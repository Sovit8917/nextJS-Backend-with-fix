import { Controller, Post, Body, Get, UseGuards, Headers, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { SendOtpDto, VerifyOtpDto, AdminLoginDto, SessionTokenDto } from './dto/auth.dto';
import { Public, CurrentUser } from '../../common/decorators';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  @Public()
  @Post('send-otp')
  @ApiOperation({ summary: 'Send OTP to phone number' })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  @Public()
  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP and login / register' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Public()
  @Post('admin/login')
  @ApiOperation({ summary: 'Admin email/password login' })
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  getMe(@CurrentUser() user: any) {
    return { data: user };
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Refresh JWT token' })
  refresh(@CurrentUser() user: any) {
    return this.authService.refreshToken(user.id, user.role);
  }

  /**
   * Internal-only: called server-to-server by the customer website's
   * Better Auth bridge, never from a browser. Guarded by a shared secret
   * header instead of a user JWT — anyone without INTERNAL_AUTH_SECRET
   * gets a 403, regardless of what userId they pass.
   */
  @Public()
  @Post('session-token')
  @ApiOperation({ summary: '[Internal] Issue a JWT for a Better-Auth-verified user' })
  issueSessionToken(
    @Headers('x-internal-secret') secret: string,
    @Body() dto: SessionTokenDto,
  ) {
    const expected = this.config.get<string>('INTERNAL_AUTH_SECRET');
    if (!expected || secret !== expected) {
      throw new ForbiddenException('Invalid internal secret');
    }
    return this.authService.issueSessionToken(dto.userId);
  }
}