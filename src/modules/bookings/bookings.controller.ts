import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser, Roles } from '../../common/decorators';
import { Role, BookingStatus } from '../../common/enums';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Roles(Role.CUSTOMER)
  @Post()
  @ApiOperation({ summary: 'Create a new booking' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(userId, dto);
  }

  @Roles(Role.CUSTOMER)
  @Get('my')
  @ApiOperation({ summary: 'Get customer bookings' })
  getUserBookings(
    @CurrentUser('id') userId: string,
    @Query('status') status?: BookingStatus,
  ) {
    return this.bookingsService.findUserBookings(userId, status);
  }

  @Roles(Role.WORKER)
  @Get('worker/my')
  @ApiOperation({ summary: 'Get worker bookings' })
  getWorkerBookings(
    @CurrentUser('id') workerId: string,
    @Query('status') status?: BookingStatus,
  ) {
    return this.bookingsService.findWorkerBookings(workerId, status);
  }

  @Roles(Role.WORKER)
  @Get('worker/today')
  @ApiOperation({ summary: "Get worker's today jobs" })
  getTodayJobs(@CurrentUser('id') workerId: string) {
    return this.bookingsService.getTodayJobs(workerId);
  }

  @Roles(Role.WORKER)
  @Get('worker/upcoming')
  @ApiOperation({ summary: "Get worker's upcoming jobs" })
  getUpcomingJobs(@CurrentUser('id') workerId: string) {
    return this.bookingsService.getUpcomingJobs(workerId);
  }

  @Roles(Role.WORKER)
  @Get('worker/pending-requests')
  @ApiOperation({ summary: 'Get new booking requests matching worker services' })
  getPendingRequests(@CurrentUser('id') workerId: string) {
    return this.bookingsService.getPendingJobsForWorker(workerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking details' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.bookingsService.findOne(id, user.id, user.role);
  }

  @Roles(Role.WORKER)
  @Put(':id/accept')
  @ApiOperation({ summary: 'Accept a booking (worker)' })
  accept(@Param('id') id: string, @CurrentUser('id') workerId: string) {
    return this.bookingsService.acceptBooking(id, workerId);
  }

  @Roles(Role.WORKER)
  @Put(':id/reject')
  @ApiOperation({ summary: 'Reject a booking (worker)' })
  reject(@Param('id') id: string, @CurrentUser('id') workerId: string) {
    return this.bookingsService.rejectBooking(id, workerId);
  }

  @Roles(Role.WORKER)
  @Put(':id/start')
  @ApiOperation({ summary: 'Start job (worker)' })
  start(@Param('id') id: string, @CurrentUser('id') workerId: string) {
    return this.bookingsService.startJob(id, workerId);
  }

  @Roles(Role.WORKER)
  @Put(':id/complete')
  @ApiOperation({ summary: 'Complete job (worker)' })
  complete(@Param('id') id: string, @CurrentUser('id') workerId: string) {
    return this.bookingsService.completeJob(id, workerId);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancel a booking' })
  cancel(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('reason') reason: string,
  ) {
    return this.bookingsService.cancelBooking(id, userId, reason);
  }
}
