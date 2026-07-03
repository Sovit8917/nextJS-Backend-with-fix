import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';
import { EVENTS } from '../../common/events/events.constants';

@Injectable()
export class NotificationsListener {
  constructor(private notificationsService: NotificationsService) {}

  @OnEvent(EVENTS.BOOKING_CREATED)
  async handleBookingCreated(payload: any) {
    await this.notificationsService.create({
      userId: payload.userId,
      title: 'Booking Confirmed! 🎉',
      body: `Your booking #${payload.bookingNumber} for ${payload.serviceNames?.join(', ')} is placed. Finding a worker for you.`,
      type: EVENTS.BOOKING_CREATED,
      extraData: { bookingId: payload.bookingId },
    });
  }

  @OnEvent(EVENTS.BOOKING_ACCEPTED)
  async handleBookingAccepted(payload: any) {
    await this.notificationsService.create({
      userId: payload.userId,
      title: 'Worker Assigned! 👷',
      body: `${payload.workerName} has accepted your booking #${payload.bookingNumber} and will arrive on time.`,
      type: EVENTS.BOOKING_ACCEPTED,
      extraData: { bookingId: payload.bookingId, workerId: payload.workerId },
    });
  }

  @OnEvent(EVENTS.BOOKING_STARTED)
  async handleBookingStarted(payload: any) {
    await this.notificationsService.create({
      userId: payload.userId,
      title: 'Job Started 🔧',
      body: 'Your service has started. The worker is now on-site.',
      type: EVENTS.BOOKING_STARTED,
      extraData: { bookingId: payload.bookingId },
    });
  }

  @OnEvent(EVENTS.BOOKING_COMPLETED)
  async handleBookingCompleted(payload: any) {
    await this.notificationsService.create({
      userId: payload.userId,
      title: 'Service Completed ✅',
      body: 'Your service is complete! Please take a moment to rate your experience.',
      type: EVENTS.BOOKING_COMPLETED,
      extraData: { bookingId: payload.bookingId },
    });

    await this.notificationsService.create({
      workerId: payload.workerId,
      title: 'Job Completed 💰',
      body: `Great work! ₹${payload.netWorkerEarning?.toFixed(2)} credited to your wallet for booking #${payload.bookingNumber}.`,
      type: EVENTS.BOOKING_COMPLETED,
      extraData: { bookingId: payload.bookingId },
    });
  }

  @OnEvent(EVENTS.BOOKING_CANCELLED)
  async handleBookingCancelled(payload: any) {
    await this.notificationsService.create({
      userId: payload.userId,
      title: 'Booking Cancelled',
      body: `Your booking #${payload.bookingNumber} has been cancelled. Reason: ${payload.cancelReason}`,
      type: EVENTS.BOOKING_CANCELLED,
      extraData: { bookingId: payload.bookingId },
    });

    if (payload.workerId) {
      await this.notificationsService.create({
        workerId: payload.workerId,
        title: 'Booking Cancelled',
        body: `Booking #${payload.bookingNumber} has been cancelled by the customer.`,
        type: EVENTS.BOOKING_CANCELLED,
        extraData: { bookingId: payload.bookingId },
      });
    }
  }

  @OnEvent(EVENTS.BOOKING_REJECTED)
  async handleBookingRejected(payload: any) {
    await this.notificationsService.create({
      userId: payload.userId,
      title: 'Finding Another Worker',
      body: `We are assigning another worker for booking #${payload.bookingNumber}.`,
      type: EVENTS.BOOKING_REJECTED,
      extraData: { bookingId: payload.bookingId },
    });
  }

  @OnEvent(EVENTS.PAYMENT_SUCCESS)
  async handlePaymentSuccess(payload: any) {
    await this.notificationsService.create({
      userId: payload.userId,
      title: 'Payment Successful 💳',
      body: `₹${payload.amount} paid via ${payload.method} for booking #${payload.bookingNumber}.`,
      type: EVENTS.PAYMENT_SUCCESS,
      extraData: { bookingId: payload.bookingId },
    });
  }

  @OnEvent(EVENTS.PAYMENT_REFUNDED)
  async handlePaymentRefunded(payload: any) {
    await this.notificationsService.create({
      userId: payload.userId,
      title: 'Refund Initiated 💸',
      body: `₹${payload.refundAmount} refund initiated for booking #${payload.bookingNumber}. Reflects in 5–7 business days.`,
      type: EVENTS.PAYMENT_REFUNDED,
      extraData: { bookingId: payload.bookingId },
    });
  }

  @OnEvent(EVENTS.WORKER_APPROVED)
  async handleWorkerApproved(payload: any) {
    await this.notificationsService.create({
      workerId: payload.workerId,
      title: 'Account Approved! 🎉',
      body: `Congratulations ${payload.workerName}! Your account is approved. You can now start accepting jobs.`,
      type: EVENTS.WORKER_APPROVED,
      extraData: {},
    });
  }
}
