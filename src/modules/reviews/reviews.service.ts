import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: { bookingId: string; rating: number; comment?: string; images?: string[] }) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: dto.bookingId, userId, status: 'COMPLETED' },
    });
    if (!booking) throw new BadRequestException('Booking not found or not completed');
    if (!booking.workerId) throw new BadRequestException('No worker assigned to this booking');

    const existing = await this.prisma.review.findUnique({ where: { bookingId: dto.bookingId } });
    if (existing) throw new BadRequestException('Review already submitted for this booking');

    const review = await this.prisma.review.create({
      data: {
        bookingId: dto.bookingId,
        userId,
        workerId: booking.workerId,
        rating: dto.rating,
        comment: dto.comment,
        images: dto.images || [],
      },
    });

    // Update worker average rating
    const stats = await this.prisma.review.aggregate({
      where: { workerId: booking.workerId },
      _avg: { rating: true },
      _count: true,
    });

    await this.prisma.worker.update({
      where: { id: booking.workerId },
      data: {
        rating: stats._avg.rating || 0,
        totalReviews: stats._count,
      },
    });

    return { message: 'Review submitted', data: review };
  }

  async getWorkerReviews(workerId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { workerId },
        include: { user: { select: { name: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where: { workerId } }),
    ]);

    const stats = await this.prisma.review.aggregate({
      where: { workerId },
      _avg: { rating: true },
      _count: true,
    });

    return {
      data: {
        reviews,
        total,
        page,
        limit,
        averageRating: stats._avg.rating || 0,
        totalReviews: stats._count,
      },
    };
  }
}
