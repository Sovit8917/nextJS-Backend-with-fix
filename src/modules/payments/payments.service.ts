import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { EVENTS } from '../../common/events/events.constants';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';

@Injectable()
export class PaymentsService {
  private razorpay: Razorpay;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.razorpay = new Razorpay({
      key_id: config.get<string>('RAZORPAY_KEY_ID', ''),
      key_secret: config.get<string>('RAZORPAY_KEY_SECRET', ''),
    });
  }

  async createOrder(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findFirst({ where: { id: bookingId, userId } });
    if (!booking) throw new NotFoundException('Booking not found');

    const order = await this.razorpay.orders.create({
      amount: Math.round(booking.finalAmount * 100),
      currency: 'INR',
      receipt: booking.bookingNumber,
    });

    await this.prisma.payment.upsert({
      where: { bookingId },
      update: { razorpayOrderId: order.id },
      create: { bookingId, amount: booking.finalAmount, method: 'UPI', razorpayOrderId: order.id },
    });

    return {
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: this.config.get('RAZORPAY_KEY_ID'),
        bookingNumber: booking.bookingNumber,
      },
    };
  }

  async verifyPayment(dto: {
    bookingId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    method: string;
  }) {
    const body = `${dto.razorpayOrderId}|${dto.razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.config.get<string>('RAZORPAY_KEY_SECRET', ''))
      .update(body)
      .digest('hex');

    if (expectedSignature !== dto.razorpaySignature) {
      throw new BadRequestException('Invalid payment signature');
    }

    const payment = await this.prisma.payment.update({
      where: { bookingId: dto.bookingId },
      data: {
        status: 'SUCCESS',
        razorpayPaymentId: dto.razorpayPaymentId,
        razorpaySignature: dto.razorpaySignature,
        method: dto.method as any,
      },
      include: { booking: { select: { bookingNumber: true, userId: true } } },
    });

    this.eventEmitter.emit(EVENTS.PAYMENT_SUCCESS, {
      bookingId: dto.bookingId,
      bookingNumber: payment.booking.bookingNumber,
      userId: payment.booking.userId,
      amount: payment.amount,
      method: dto.method,
    });

    return { message: 'Payment verified successfully', data: payment };
  }

  async handleRazorpayWebhook(payload: any, signature: string, webhookSecret: string) {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;

    if (event === 'payment.captured' && paymentEntity) {
      const payment = await this.prisma.payment.findFirst({
        where: { razorpayOrderId: paymentEntity.order_id },
        include: { booking: { select: { bookingNumber: true, userId: true } } },
      });

      if (payment && payment.status !== 'SUCCESS') {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'SUCCESS', razorpayPaymentId: paymentEntity.id },
        });

        this.eventEmitter.emit(EVENTS.PAYMENT_SUCCESS, {
          bookingId: payment.bookingId,
          bookingNumber: payment.booking.bookingNumber,
          userId: payment.booking.userId,
          amount: payment.amount,
          method: paymentEntity.method,
        });
      }
    }

    if (event === 'refund.processed' && paymentEntity) {
      const payment = await this.prisma.payment.findFirst({
        where: { razorpayPaymentId: paymentEntity.payment_id },
        include: { booking: { select: { bookingNumber: true, userId: true } } },
      });

      if (payment) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'REFUNDED',
            refundId: paymentEntity.id,
            refundAmount: paymentEntity.amount / 100,
            refundedAt: new Date(),
          },
        });

        this.eventEmitter.emit(EVENTS.PAYMENT_REFUNDED, {
          bookingId: payment.bookingId,
          bookingNumber: payment.booking.bookingNumber,
          userId: payment.booking.userId,
          refundAmount: paymentEntity.amount / 100,
        });
      }
    }

    return { received: true };
  }

  async payCash(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findFirst({ where: { id: bookingId, userId } });
    if (!booking) throw new NotFoundException('Booking not found');

    const payment = await this.prisma.payment.upsert({
      where: { bookingId },
      update: { method: 'CASH', status: 'PENDING' },
      create: { bookingId, amount: booking.finalAmount, method: 'CASH', status: 'PENDING' },
    });

    return { message: 'Cash payment recorded', data: payment };
  }

  async payFromWallet(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findFirst({ where: { id: bookingId, userId } });
    if (!booking) throw new NotFoundException('Booking not found');

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.balance < booking.finalAmount) {
      throw new BadRequestException(`Insufficient wallet balance. Balance: ₹${wallet?.balance ?? 0}`);
    }

    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { userId },
        data: { balance: { decrement: booking.finalAmount } },
      }),
      this.prisma.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEBIT',
          amount: booking.finalAmount,
          description: `Payment for booking #${booking.bookingNumber}`,
          referenceId: bookingId,
        },
      }),
      this.prisma.payment.upsert({
        where: { bookingId },
        update: { method: 'WALLET', status: 'SUCCESS' },
        create: { bookingId, amount: booking.finalAmount, method: 'WALLET', status: 'SUCCESS' },
      }),
    ]);

    this.eventEmitter.emit(EVENTS.PAYMENT_SUCCESS, {
      bookingId,
      bookingNumber: booking.bookingNumber,
      userId,
      amount: booking.finalAmount,
      method: 'WALLET',
    });

    return { message: 'Payment successful from wallet' };
  }

  async initiateRefund(bookingId: string, amount?: number, refundTo: 'ORIGINAL' | 'WALLET' = 'ORIGINAL') {
    const payment = await this.prisma.payment.findUnique({
      where: { bookingId },
      include: { booking: { select: { bookingNumber: true, userId: true } } },
    });
    if (!payment || payment.status !== 'SUCCESS') {
      throw new BadRequestException('No successful payment found for refund');
    }

    const refundAmount = amount ?? payment.amount;

    // Customer explicitly chose wallet credit, OR the original payment was
    // already a wallet payment (nowhere else to refund it to).
    const creditToWallet = refundTo === 'WALLET' || payment.method === 'WALLET';

    if (creditToWallet) {
      const wallet = await this.prisma.wallet.findUnique({ where: { userId: payment.booking.userId } });
      if (wallet) {
        await this.prisma.wallet.update({
          where: { userId: payment.booking.userId },
          data: { balance: { increment: refundAmount } },
        });
        await this.prisma.transaction.create({
          data: {
            walletId: wallet.id,
            type: 'CREDIT',
            amount: refundAmount,
            description: `Refund for booking #${payment.booking.bookingNumber}`,
            referenceId: bookingId,
          },
        });
      }
      await this.prisma.payment.update({
        where: { bookingId },
        data: { status: 'REFUNDED', refundAmount, refundedAt: new Date() },
      });
    } else if (payment.razorpayPaymentId) {
      const refund = await this.razorpay.payments.refund(payment.razorpayPaymentId, {
        amount: Math.round(refundAmount * 100),
      });
      await this.prisma.payment.update({
        where: { bookingId },
        data: { status: 'REFUNDED', refundId: refund.id, refundAmount, refundedAt: new Date() },
      });
    }

    this.eventEmitter.emit(EVENTS.PAYMENT_REFUNDED, {
      bookingId,
      bookingNumber: payment.booking.bookingNumber,
      userId: payment.booking.userId,
      refundAmount,
      refundedTo: creditToWallet ? 'WALLET' : 'ORIGINAL',
    });

    return { message: 'Refund initiated successfully' };
  }

  async getPaymentDetails(bookingId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { bookingId } });
    if (!payment) throw new NotFoundException('Payment not found');
    return { data: payment };
  }

  async getAllPaymentsList(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        include: {
          booking: {
            select: {
              bookingNumber: true,
              user: { select: { name: true, phone: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count(),
    ]);
    return { data: { payments, total, page, limit } };
  }
}