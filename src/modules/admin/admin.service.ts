import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENTS } from '../../common/events/events.constants';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  // ─── Admin Auth ────────────────────────────────────────────────

  async seedAdmin(email: string, password: string, name: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('Admin already exists');

    const hashed = await bcrypt.hash(password, 10);
    const admin = await this.prisma.user.create({
      data: { phone: email, email, name, role: 'ADMIN' },
    });
    return { message: 'Admin created', data: { id: admin.id, email } };
  }

  // ─── Customer Management ───────────────────────────────────────

  async getCustomers(search?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          role: 'CUSTOMER' as const,
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : { role: 'CUSTOMER' as const };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { _count: { select: { bookings: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data: { users, total, page, limit } };
  }

  async getCustomerDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        bookings: {
          include: { items: { include: { service: { select: { name: true } } } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        wallet: true,
        _count: { select: { bookings: true, reviews: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return { data: user };
  }

  async blockUser(userId: string, isBlocked: boolean) {
    await this.prisma.user.update({ where: { id: userId }, data: { isBlocked } });
    return { message: `User ${isBlocked ? 'blocked' : 'unblocked'}` };
  }

  // ─── Worker Management ─────────────────────────────────────────

  async getWorkers(status?: string, search?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const [workers, total] = await Promise.all([
      this.prisma.worker.findMany({
        where,
        include: {
          documents: true,
          services: { include: { service: { select: { name: true } } } },
          _count: { select: { bookings: true, reviews: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.worker.count({ where }),
    ]);
    return { data: { workers, total, page, limit } };
  }

  async getWorkerDetails(workerId: string) {
    const worker = await this.prisma.worker.findUnique({
      where: { id: workerId },
      include: {
        documents: true,
        skills: true,
        bankDetail: true,
        services: { include: { service: true } },
        earnings: { orderBy: { date: 'desc' }, take: 10 },
        wallet: true,
        reviews: { include: { user: { select: { name: true } } }, take: 5 },
        _count: { select: { bookings: true, reviews: true } },
      },
    });
    if (!worker) throw new NotFoundException('Worker not found');
    return { data: worker };
  }

  async updateWorkerStatus(workerId: string, status: 'APPROVED' | 'REJECTED' | 'SUSPENDED') {
    const worker = await this.prisma.worker.update({
      where: { id: workerId },
      data: { status },
    });
    if (status === 'APPROVED') {
      this.eventEmitter.emit(EVENTS.WORKER_APPROVED, {
        workerId,
        workerName: worker.name ?? '',
        workerPhone: worker.phone,
      });
    }
    if (status === 'APPROVED') {
      this.eventEmitter.emit(EVENTS.WORKER_APPROVED, {
        workerId,
        workerName: worker.name ?? '',
        workerPhone: worker.phone,
      });
    }
    return { message: `Worker ${status.toLowerCase()}`, data: worker };
  }

  async verifyDocument(documentId: string, isVerified: boolean) {
    await this.prisma.workerDocument.update({
      where: { id: documentId },
      data: { isVerified },
    });
    return { message: `Document ${isVerified ? 'verified' : 'rejected'}` };
  }

  // ─── Booking Management ────────────────────────────────────────

  async getAllBookings(status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = status ? { status: status as any } : {};

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: {
          user: { select: { name: true, phone: true } },
          worker: { select: { name: true, phone: true } },
          items: { include: { service: { select: { name: true } } } },
          payment: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);
    return { data: { bookings, total, page, limit } };
  }

  async assignWorker(bookingId: string, workerId: string) {
    const booking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { workerId, status: 'ACCEPTED' },
    });
    return { message: 'Worker assigned', data: booking };
  }

  async cancelBookingAdmin(bookingId: string, reason: string) {
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED', cancelReason: reason },
    });
    return { message: 'Booking cancelled' };
  }

  // ─── Settings ──────────────────────────────────────────────────

  async getSettings() {
    const settings = await this.prisma.appSetting.findMany();
    const result = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
    return { data: result };
  }

  async updateSetting(key: string, value: string) {
    const setting = await this.prisma.appSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    return { message: 'Setting updated', data: setting };
  }

  async updateSettings(settings: Record<string, string>) {
    for (const [key, value] of Object.entries(settings)) {
      await this.prisma.appSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
    }
    return { message: 'Settings updated' };
  }

  // ─── Banners ───────────────────────────────────────────────────

  async getBanners(activeOnly = true) {
    const banners = await this.prisma.banner.findMany({
      where: activeOnly ? { isActive: true } : {},
      orderBy: { sortOrder: 'asc' },
    });
    return { data: banners };
  }

  async createBanner(data: { title: string; image: string; link?: string; sortOrder?: number }) {
    const banner = await this.prisma.banner.create({ data });
    return { message: 'Banner created', data: banner };
  }

  async updateBanner(id: string, data: any) {
    const banner = await this.prisma.banner.update({ where: { id }, data });
    return { message: 'Banner updated', data: banner };
  }

  async deleteBanner(id: string) {
    await this.prisma.banner.delete({ where: { id } });
    return { message: 'Banner deleted' };
  }

  // ─── Payment Management ────────────────────────────────────────

  async getAllPayments(status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = status ? { status: status as any } : {};

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          booking: {
            include: {
              user: { select: { name: true, phone: true } },
              worker: { select: { name: true, phone: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return { data: { payments, total, page, limit } };
  }

  async getWorkerWallets(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [wallets, total] = await Promise.all([
      this.prisma.workerWallet.findMany({
        include: { worker: { select: { name: true, phone: true } } },
        orderBy: { balance: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.workerWallet.count(),
    ]);
    return { data: { wallets, total, page, limit } };
  }
}
