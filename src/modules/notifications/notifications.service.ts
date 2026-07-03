import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PushService } from './push.service';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private pushService: PushService,
  ) {}

  async create(data: {
    userId?: string;
    workerId?: string;
    title: string;
    body: string;
    type: string;
    extraData?: any;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        workerId: data.workerId,
        title: data.title,
        body: data.body,
        type: data.type,
        data: data.extraData,
      },
    });

    // Fire-and-forget: push delivery must never block or fail the caller.
    this.dispatchPush(data).catch(() => undefined);

    return notification;
  }

  private async dispatchPush(data: {
    userId?: string;
    workerId?: string;
    title: string;
    body: string;
    type: string;
    extraData?: any;
  }) {
    const recipient = data.userId
      ? await this.prisma.user.findUnique({ where: { id: data.userId }, select: { fcmToken: true } })
      : data.workerId
        ? await this.prisma.worker.findUnique({ where: { id: data.workerId }, select: { fcmToken: true } })
        : null;

    if (!recipient?.fcmToken) return;

    const pushData: Record<string, string> = { type: data.type };
    if (data.extraData?.bookingId) pushData.bookingId = String(data.extraData.bookingId);

    await this.pushService.sendToToken(recipient.fcmToken, {
      title: data.title,
      body: data.body,
      data: pushData,
    });
  }

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { data: { notifications, total, unreadCount, page, limit } };
  }

  async getWorkerNotifications(workerId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { workerId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { workerId } }),
      this.prisma.notification.count({ where: { workerId, isRead: false } }),
    ]);
    return { data: { notifications, total, unreadCount, page, limit } };
  }

  async markAsRead(notificationId: string) {
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
    return { message: 'Marked as read' };
  }

  async markAllAsRead(userId?: string, workerId?: string) {
    await this.prisma.notification.updateMany({
      where: { ...(userId && { userId }), ...(workerId && { workerId }), isRead: false },
      data: { isRead: true },
    });
    return { message: 'All notifications marked as read' };
  }

  async sendBulk(data: {
    title: string;
    body: string;
    type: string;
    targetRole?: string;
  }) {
    if (data.targetRole === 'CUSTOMER' || !data.targetRole) {
      const users = await this.prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      await this.prisma.notification.createMany({
        data: users.map((u) => ({
          userId: u.id,
          title: data.title,
          body: data.body,
          type: data.type,
        })),
      });
    }

    if (data.targetRole === 'WORKER' || !data.targetRole) {
      const workers = await this.prisma.worker.findMany({
        where: { isActive: true, status: 'APPROVED' },
        select: { id: true },
      });
      await this.prisma.notification.createMany({
        data: workers.map((w) => ({
          workerId: w.id,
          title: data.title,
          body: data.body,
          type: data.type,
        })),
      });
    }

    return { message: 'Bulk notification sent' };
  }
}
