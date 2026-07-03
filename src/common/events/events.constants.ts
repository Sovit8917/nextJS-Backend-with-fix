export const EVENTS = {
  // Booking lifecycle
  BOOKING_CREATED: 'booking.created',
  BOOKING_ACCEPTED: 'booking.accepted',
  BOOKING_REJECTED: 'booking.rejected',
  BOOKING_STARTED: 'booking.started',
  BOOKING_COMPLETED: 'booking.completed',
  BOOKING_CANCELLED: 'booking.cancelled',

  // Payment events
  PAYMENT_SUCCESS: 'payment.success',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',

  // Worker events
  WORKER_APPROVED: 'worker.approved',
  WORKER_SUSPENDED: 'worker.suspended',
  WORKER_DOCUMENT_VERIFIED: 'worker.document.verified',

  // Chat events
  CHAT_MESSAGE_SENT: 'chat.message.sent',

  // Review events
  REVIEW_CREATED: 'review.created',
} as const;

export type EventKey = (typeof EVENTS)[keyof typeof EVENTS];
