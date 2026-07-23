import 'dotenv/config';
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { SendOtpDto, VerifyOtpDto, AdminLoginDto } from './dto/auth.dto';
import { Role } from '../../common/enums';
import twilio from 'twilio';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private twilioClient: twilio.Twilio;
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {
    this.twilioClient = twilio(
      config.get('TWILIO_ACCOUNT_SID'),
      config.get('TWILIO_AUTH_TOKEN'),
    );
    console.log('OTP_BYPASS =', this.config.get('OTP_BYPASS'));
  }

  async sendOtp(dto: SendOtpDto) {
    const bypassOtp = this.config.get('OTP_BYPASS');

    // Bypass Twilio entirely in dev/testing — nothing is sent, the frontend
    // is expected to submit OTP_BYPASS as the code in verifyOtp().
    if (bypassOtp) {
      return {
        message: 'OTP sent successfully',
        ...(this.config.get('NODE_ENV') === 'development' && { otp: bypassOtp }),
      };
    }

    // Send via Twilio Verify — Verify generates, stores, and expires the
    // code on Twilio's side (handles A2P 10DLC compliance for us too), so
    // we don't manage our own otp table or expiry for this path.
    const verifyServiceSid = this.config.get('TWILIO_VERIFY_SERVICE_SID');
    try {
      await this.twilioClient.verify.v2
        .services(verifyServiceSid)
        .verifications.create({ to: dto.phone, channel: 'sms' });
    } catch (err: any) {
      // Twilio Verify error codes worth knowing while debugging "OTP not received":
      //  60200 - invalid 'to' phone number (missing/wrong country code)
      //  60203 - max send attempts reached for this number
      //  60212 - too many concurrent requests for this number
      this.logger.error(
        `Twilio Verify send failed for ${dto.phone}: [${err?.code}] ${err?.message}`,
      );
      throw new BadRequestException(
        'Failed to send OTP. Please check the phone number and try again.',
      );
    }

    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const role = dto.role || Role.CUSTOMER;

    // Bypass OTP for development/testing — always takes priority, no
    // Twilio call made at all when the submitted code matches.
    const bypassOtp = this.config.get('OTP_BYPASS');
    const isValid =
      dto.otp === bypassOtp || (await this.checkVerifyOtp(dto.phone, dto.otp));

    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    if (role === Role.WORKER) {
      return this.handleWorkerAuth(dto.phone);
    }
    return this.handleUserAuth(dto.phone, role);
  }

  private async handleUserAuth(phone: string, role: Role) {
    let user = await this.prisma.user.findUnique({ where: { phone } });
    let isNew = false;

    if (!user) {
      user = await this.prisma.user.create({
        data: { phone, role },
      });
      // Create wallet for new user
      await this.prisma.wallet.create({ data: { userId: user.id } });
      isNew = true;
    }

    const token = this.generateToken(user.id, user.role);
    return { message: 'Login successful', data: { token, user, isNew } };
  }

  private async handleWorkerAuth(phone: string) {
    let worker = await this.prisma.worker.findUnique({ where: { phone } });
    let isNew = false;

    if (!worker) {
      worker = await this.prisma.worker.create({ data: { phone } });
      await this.prisma.workerWallet.create({ data: { workerId: worker.id } });
      isNew = true;
    }

    const token = this.generateToken(worker.id, Role.WORKER);
    return { message: 'Login successful', data: { token, worker, isNew } };
  }

  private async checkVerifyOtp(phone: string, otp: string): Promise<boolean> {
    const verifyServiceSid = this.config.get('TWILIO_VERIFY_SERVICE_SID');
    try {
      const check = await this.twilioClient.verify.v2
        .services(verifyServiceSid)
        .verificationChecks.create({ to: phone, code: otp });
      return check.status === 'approved';
    } catch (err: any) {
      // Twilio throws (rather than returning a status) for things like an
      // already-checked or fully expired verification — treat as invalid.
      this.logger.warn(
        `Twilio Verify check failed for ${phone}: [${err?.code}] ${err?.message}`,
      );
      return false;
    }
  }

  async adminLogin(dto: AdminLoginDto) {
  const admin = await this.prisma.user.findUnique({
    where: { email: dto.email },
  });

  if (!admin || admin.role !== Role.ADMIN) {
    throw new UnauthorizedException('Invalid email or password');
  }
  if (!admin.password) {
    throw new UnauthorizedException('Invalid email or password');
  }

  const isMatch = await bcrypt.compare(dto.password, admin.password);
  if (!isMatch) {
    throw new UnauthorizedException('Invalid email or password');
  }
  if (admin.isBlocked || !admin.isActive) {
    throw new UnauthorizedException('Account is disabled');
  }

  const token = this.generateToken(admin.id, admin.role);
  return { message: 'Login successful', data: { token, user: admin } };
}

  private generateToken(id: string, role: string): string {
    return this.jwtService.sign({ sub: id, role });
  }

  /**
   * Issues a NestJS-compatible JWT for a user id that the customer
   * website's Better Auth instance has already authenticated (Google or
   * email/password) and upserted into the shared User table. The caller
   * (auth.controller.ts) is responsible for verifying the internal
   * shared-secret header before calling this — this method itself does
   * no auth of its own, so it must never be reachable without that check.
   */
  async issueSessionToken(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.isBlocked || !user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    // Customers who sign up via Google/email on the website won't have a
    // wallet yet (unlike phone-OTP signups, which create one in
    // handleUserAuth) — create it lazily here on first bridge call so
    // wallet-dependent features (bookings, payments) work the same way.
    if (user.role === Role.CUSTOMER) {
      const wallet = await this.prisma.wallet.findUnique({ where: { userId: user.id } });
      if (!wallet) await this.prisma.wallet.create({ data: { userId: user.id } });
    }

    const token = this.generateToken(user.id, user.role);
    return { data: { token, user } };
  }

  async refreshToken(userId: string, role: string) {
    const token = this.generateToken(userId, role);
    return { data: { token } };
  }
}