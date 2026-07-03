import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalWorkers,
      totalBookings,
      todayBookings,
      totalRevenue,
      todayRevenue,
      pendingWorkers,
      openTickets,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.worker.count({ where: { status: 'APPROVED' } }),
      this.prisma.booking.count(),
      this.prisma.booking.count({ where: { createdAt: { gte: today } } }),
      this.prisma.payment.aggregate({
        where: { status: 'SUCCESS' },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { status: 'SUCCESS', createdAt: { gte: today } },
        _sum: { amount: true },
      }),
      this.prisma.worker.count({ where: { status: 'PENDING' } }),
      this.prisma.supportTicket.count({ where: { status: 'OPEN' } }),
    ]);

    const bookingsByStatus = await this.prisma.booking.groupBy({
      by: ['status'],
      _count: true,
    });

    return {
      data: {
        totalUsers,
        totalWorkers,
        totalBookings,
        todayBookings,
        totalRevenue: totalRevenue._sum.amount || 0,
        todayRevenue: todayRevenue._sum.amount || 0,
        pendingWorkers,
        openTickets,
        bookingsByStatus: bookingsByStatus.reduce(
          (acc, b) => ({ ...acc, [b.status]: b._count }),
          {},
        ),
      },
    };
  }

  async getRevenueReport(from: Date, to: Date, groupBy: 'day' | 'month' = 'day') {
    const payments = await this.prisma.payment.findMany({
      where: { status: 'SUCCESS', createdAt: { gte: from, lte: to } },
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // Group by day or month
    const grouped: Record<string, number> = {};
    for (const p of payments) {
      const key =
        groupBy === 'day'
          ? p.createdAt.toISOString().split('T')[0]
          : `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, '0')}`;
      grouped[key] = (grouped[key] || 0) + p.amount;
    }

    const total = payments.reduce((sum, p) => sum + p.amount, 0);
    return { data: { chart: grouped, total, from, to } };
  }

  async getBookingReport(from: Date, to: Date) {
    const [bookings, byStatus, topServices] = await Promise.all([
      this.prisma.booking.count({ where: { createdAt: { gte: from, lte: to } } }),
      this.prisma.booking.groupBy({
        by: ['status'],
        where: { createdAt: { gte: from, lte: to } },
        _count: true,
      }),
      this.prisma.bookingItem.groupBy({
        by: ['serviceId'],
        where: { booking: { createdAt: { gte: from, lte: to } } },
        _count: true,
        orderBy: { _count: { serviceId: 'desc' } },
        take: 5,
      }),
    ]);

    const serviceIds = topServices.map((s) => s.serviceId);
    const services = await this.prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, name: true },
    });

    return {
      data: {
        total: bookings,
        byStatus: byStatus.reduce((acc, b) => ({ ...acc, [b.status]: b._count }), {}),
        topServices: topServices.map((s) => ({
          ...s,
          service: services.find((sv) => sv.id === s.serviceId),
        })),
        from,
        to,
      },
    };
  }

  async getWorkerReport(from: Date, to: Date) {
    const [topWorkers, workersByStatus] = await Promise.all([
      this.prisma.booking.groupBy({
        by: ['workerId'],
        where: {
          status: 'COMPLETED',
          completedAt: { gte: from, lte: to },
          workerId: { not: null },
        },
        _count: true,
        orderBy: { _count: { workerId: 'desc' } },
        take: 10,
      }),
      this.prisma.worker.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    const workerIds = topWorkers.map((w) => w.workerId).filter(Boolean) as string[];
    const workers = await this.prisma.worker.findMany({
      where: { id: { in: workerIds } },
      select: { id: true, name: true, rating: true, totalJobs: true },
    });

    return {
      data: {
        topWorkers: topWorkers.map((w) => ({
          completedJobs: w._count,
          worker: workers.find((wr) => wr.id === w.workerId),
        })),
        workersByStatus: workersByStatus.reduce(
          (acc, w) => ({ ...acc, [w.status]: w._count }),
          {},
        ),
        from,
        to,
      },
    };
  }

  async getCustomerReport(from: Date, to: Date) {
    const [newUsers, topCustomers] = await Promise.all([
      this.prisma.user.count({
        where: { role: 'CUSTOMER', createdAt: { gte: from, lte: to } },
      }),
      this.prisma.booking.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: from, lte: to } },
        _count: true,
        _sum: { finalAmount: true },
        orderBy: { _sum: { finalAmount: 'desc' } },
        take: 10,
      }),
    ]);

    const userIds = topCustomers.map((c) => c.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, phone: true },
    });

    return {
      data: {
        newUsers,
        topCustomers: topCustomers.map((c) => ({
          bookings: c._count,
          totalSpend: c._sum.finalAmount,
          user: users.find((u) => u.id === c.userId),
        })),
        from,
        to,
      },
    };
  }
}
