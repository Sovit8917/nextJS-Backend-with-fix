export interface BookingCreatedEvent {
  bookingId: string;
  bookingNumber: string;
  userId: string;
  serviceNames: string[];
  scheduledDate: Date;
  scheduledTime: string;
  finalAmount: number;
  addressCity: string;
}

export interface BookingAcceptedEvent {
  bookingId: string;
  bookingNumber: string;
  userId: string;
  workerId: string;
  workerName: string;
  workerPhone: string;
}

export interface BookingCompletedEvent {
  bookingId: string;
  bookingNumber: string;
  userId: string;
  workerId: string;
  finalAmount: number;
  netWorkerEarning: number;
}

export interface BookingCancelledEvent {
  bookingId: string;
  bookingNumber: string;
  userId: string;
  workerId?: string;
  cancelReason: string;
}

export interface PaymentSuccessEvent {
  bookingId: string;
  bookingNumber: string;
  userId: string;
  amount: number;
  method: string;
}

export interface PaymentRefundedEvent {
  bookingId: string;
  userId: string;
  refundAmount: number;
}

export interface WorkerApprovedEvent {
  workerId: string;
  workerName: string;
  workerPhone: string;
}

export interface ChatMessageSentEvent {
  bookingId: string;
  senderId: string;
  senderType: string;
  message: string;
  recipientId: string;
}
