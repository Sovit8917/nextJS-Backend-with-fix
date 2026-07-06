import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  async createTicket(dto: {
    subject: string;
    description: string;
    userId?: string;
    workerId?: string;
  }) {
    const ticket = await this.prisma.supportTicket.create({ data: dto });
    return { message: 'Ticket created', data: ticket };
  }

  async getMyTickets(requesterId: string, role: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const where = role === 'WORKER' ? { workerId: requesterId } : { userId: requesterId };
    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return { data: { tickets, total, page, limit } };
  }

  async getTicket(ticketId: string, requesterId: string, role: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');

    if (
      role !== 'ADMIN' &&
      ticket.userId !== requesterId &&
      ticket.workerId !== requesterId
    ) {
      throw new ForbiddenException('Access denied');
    }

    return { data: ticket };
  }

  async replyToTicket(ticketId: string, senderId: string, senderType: string, message: string) {
    if (!message?.trim()) {
      throw new ForbiddenException('Message cannot be empty');
    }

    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    if (
      senderType !== 'ADMIN' &&
      ticket.userId !== senderId &&
      ticket.workerId !== senderId
    ) {
      throw new ForbiddenException('Access denied');
    }

    if (ticket.status === 'CLOSED') {
      throw new ForbiddenException('This ticket is closed and can no longer accept replies');
    }

    const msg = await this.prisma.ticketMessage.create({
      data: { ticketId, senderId, senderType, message: message.trim() },
    });

    // A customer/worker reply on a resolved ticket reopens it for the admin
    if (ticket.status === 'RESOLVED' && senderType !== 'ADMIN') {
      await this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: { status: 'OPEN', resolvedAt: null },
      });
    }

    return { message: 'Reply sent', data: msg };
  }

  async closeMyTicket(ticketId: string, requesterId: string, role: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    if (
      role !== 'ADMIN' &&
      ticket.userId !== requesterId &&
      ticket.workerId !== requesterId
    ) {
      throw new ForbiddenException('Access denied');
    }

    if (ticket.status === 'CLOSED') {
      throw new ForbiddenException('Ticket is already closed');
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'CLOSED' },
    });
    return { message: 'Ticket closed', data: updated };
  }

  async resolveTicket(ticketId: string) {
    const ticket = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });
    return { message: 'Ticket resolved', data: ticket };
  }

  async closeTicket(ticketId: string) {
    const ticket = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'CLOSED' },
    });
    return { message: 'Ticket closed', data: ticket };
  }

  // Admin: get all tickets
  async getAllTickets(status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = status ? { status: status as any } : {};
    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        include: {
          user: { select: { name: true, phone: true } },
          worker: { select: { name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);
    return { data: { tickets, total, page, limit } };
  }

  async getFaqs() {
    const faqs = [
      { id: 'faq-1', question: 'How do I book a service?', answer: 'Browse services, select a worker, choose date/time and confirm booking.' },
      { id: 'faq-2', question: 'How do I cancel a booking?', answer: 'Go to your booking details and tap Cancel. Cancellation charges may apply.' },
      { id: 'faq-3', question: 'When will I get my refund?', answer: 'Refunds are processed within 5-7 business days to your original payment method.' },
      { id: 'faq-4', question: 'How is the worker rated?', answer: 'After service completion, you can rate and review the worker out of 5 stars.' },
      { id: 'faq-5', question: 'Is my payment secure?', answer: 'Yes, all payments are processed via Razorpay with bank-grade encryption.' },
    ];
    return { data: faqs };
  }
}