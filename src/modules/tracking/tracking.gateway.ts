import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/tracking',
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private connectedWorkers = new Map<string, string>(); // socketId → workerId

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(socket: Socket) {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];
      const payload = this.jwtService.verify(token, {
        secret: this.config.get('JWT_SECRET'),
      });
      this.connectedWorkers.set(socket.id, payload.sub);
    } catch {
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    this.connectedWorkers.delete(socket.id);
  }

  @SubscribeMessage('worker:location')
  async handleWorkerLocation(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { bookingId: string; latitude: number; longitude: number },
  ) {
    const workerId = this.connectedWorkers.get(socket.id);
    if (!workerId) return;

    // Update worker location in DB
    await this.prisma.worker.update({
      where: { id: workerId },
      data: { latitude: data.latitude, longitude: data.longitude },
    });

    // Save tracking record
    await this.prisma.workerTracking.create({
      data: { bookingId: data.bookingId, workerId, latitude: data.latitude, longitude: data.longitude },
    });

    // Broadcast to customers tracking this booking
    this.server.to(`track:${data.bookingId}`).emit('location:update', {
      workerId,
      latitude: data.latitude,
      longitude: data.longitude,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('track:booking')
  handleTrackBooking(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { bookingId: string },
  ) {
    socket.join(`track:${data.bookingId}`);
  }

  @SubscribeMessage('track:stop')
  handleStopTracking(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { bookingId: string },
  ) {
    socket.leave(`track:${data.bookingId}`);
  }

  // Emit booking events to specific users
  emitBookingEvent(bookingId: string, event: string, data: any) {
    this.server.to(`track:${bookingId}`).emit(event, data);
  }
}
