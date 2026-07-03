import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async getMessages(bookingId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const messages = await this.prisma.chatMessage.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
    });
    return { data: messages };
  }

  async getBookingChats(userId: string, role: string) {
    const bookings = await this.prisma.booking.findMany({
      where: role === 'WORKER' ? { workerId: userId } : { userId },
      include: {
        chatMessages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        user: { select: { name: true, avatar: true } },
        worker: { select: { name: true, avatar: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return { data: bookings };
  }

  async getUnreadCount(bookingId: string, userId: string) {
    const count = await this.prisma.chatMessage.count({
      where: { bookingId, senderId: { not: userId }, isRead: false },
    });
    return { data: { count } };
  }
}
