import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'fallback-secret'),
    });
  }

  async validate(payload: any) {
    const { sub, role } = payload;

    if (role === 'ADMIN' || role === 'CUSTOMER') {
      const user = await this.prisma.user.findUnique({ where: { id: sub } });
      if (!user || !user.isActive || user.isBlocked) {
        throw new UnauthorizedException('Account not active');
      }
      return { ...user, role: user.role };
    }

    if (role === 'WORKER') {
      const worker = await this.prisma.worker.findUnique({ where: { id: sub } });
      if (!worker || !worker.isActive || worker.isBlocked) {
        throw new UnauthorizedException('Account not active');
      }
      return { ...worker, role: 'WORKER' };
    }

    throw new UnauthorizedException();
  }
}
