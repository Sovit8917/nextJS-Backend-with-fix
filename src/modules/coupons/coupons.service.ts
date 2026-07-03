import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [coupons, total] = await Promise.all([
      this.prisma.coupon.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.coupon.count(),
    ]);
    return { data: { coupons, total, page, limit } };
  }

  async getActive() {
    const coupons = await this.prisma.coupon.findMany({
      where: {
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
    });
    return { data: coupons };
  }

  async validate(code: string, orderAmount: number) {
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        code: code.toUpperCase(),
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
      },
    });

    if (!coupon) throw new NotFoundException('Coupon not found or expired');

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    if (orderAmount < coupon.minOrderValue) {
      throw new BadRequestException(
        `Minimum order value of ₹${coupon.minOrderValue} required for this coupon`,
      );
    }

    let discount =
      coupon.discountType === 'percentage'
        ? (orderAmount * coupon.discountValue) / 100
        : coupon.discountValue;

    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);

    return {
      data: {
        coupon,
        discount,
        finalAmount: orderAmount - discount,
      },
    };
  }

  async create(dto: {
    code: string;
    description?: string;
    discountType: string;
    discountValue: number;
    minOrderValue?: number;
    maxDiscount?: number;
    usageLimit?: number;
    expiresAt?: Date;
  }) {
    const coupon = await this.prisma.coupon.create({
      data: { ...dto, code: dto.code.toUpperCase() },
    });
    return { message: 'Coupon created', data: coupon };
  }

  async update(id: string, dto: any) {
    const coupon = await this.prisma.coupon.update({
      where: { id },
      data: dto,
    });
    return { message: 'Coupon updated', data: coupon };
  }

  async remove(id: string) {
    await this.prisma.coupon.update({ where: { id }, data: { isActive: false } });
    return { message: 'Coupon deleted' };
  }
}
