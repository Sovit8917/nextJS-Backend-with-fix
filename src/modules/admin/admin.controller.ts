import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, Public } from '../../common/decorators';
import { Role } from '../../common/enums';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  // Seed first admin (public - only works if no admin exists)
  @Public()
  @Post('seed')
  seedAdmin(@Body() dto: { email: string; password: string; name: string }) {
    return this.adminService.seedAdmin(dto.email, dto.password, dto.name);
  }

  // ─── Customers ─────────────────────────────────────────────────

  @Get('customers')
  getCustomers(
    @Query('search') search: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.adminService.getCustomers(search, +page || 1, +limit || 20);
  }

  @Get('customers/:id')
  getCustomerDetails(@Param('id') id: string) {
    return this.adminService.getCustomerDetails(id);
  }

  @Put('customers/:id/block')
  blockUser(@Param('id') id: string, @Body('isBlocked') isBlocked: boolean) {
    return this.adminService.blockUser(id, isBlocked);
  }

  // ─── Workers ───────────────────────────────────────────────────

  @Get('workers')
  getWorkers(
    @Query('status') status: string,
    @Query('search') search: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.adminService.getWorkers(status, search, +page || 1, +limit || 20);
  }

  @Get('workers/:id')
  getWorkerDetails(@Param('id') id: string) {
    return this.adminService.getWorkerDetails(id);
  }

  @Put('workers/:id/status')
  updateWorkerStatus(
    @Param('id') id: string,
    @Body('status') status: 'APPROVED' | 'REJECTED' | 'SUSPENDED',
  ) {
    return this.adminService.updateWorkerStatus(id, status);
  }

  @Put('workers/documents/:docId/verify')
  verifyDocument(@Param('docId') docId: string, @Body('isVerified') isVerified: boolean) {
    return this.adminService.verifyDocument(docId, isVerified);
  }

  // ─── Bookings ──────────────────────────────────────────────────

  @Get('bookings')
  getAllBookings(
    @Query('status') status: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.adminService.getAllBookings(status, +page || 1, +limit || 20);
  }

  @Put('bookings/:id/assign')
  assignWorker(@Param('id') id: string, @Body('workerId') workerId: string) {
    return this.adminService.assignWorker(id, workerId);
  }

  @Put('bookings/:id/cancel')
  cancelBooking(@Param('id') id: string, @Body('reason') reason: string) {
    return this.adminService.cancelBookingAdmin(id, reason);
  }

  // ─── Payments ──────────────────────────────────────────────────

  @Get('payments')
  getAllPayments(@Query('status') status: string, @Query('page') page: number, @Query('limit') limit: number) {
    return this.adminService.getAllPayments(status, +page || 1, +limit || 20);
  }

  @Get('payments/worker-wallets')
  getWorkerWallets(@Query('page') page: number, @Query('limit') limit: number) {
    return this.adminService.getWorkerWallets(+page || 1, +limit || 20);
  }

  // ─── Settings ──────────────────────────────────────────────────

  @Get('settings')
  getSettings() {
    return this.adminService.getSettings();
  }

  @Put('settings')
  updateSettings(@Body() settings: Record<string, string>) {
    return this.adminService.updateSettings(settings);
  }

  @Put('settings/:key')
  updateSetting(@Param('key') key: string, @Body('value') value: string) {
    return this.adminService.updateSetting(key, value);
  }

  // ─── Banners ───────────────────────────────────────────────────

  @Get('banners')
  getBanners(@Query('all') all: string) {
    return this.adminService.getBanners(all !== 'true');
  }

  @Post('banners')
  createBanner(@Body() data: any) {
    return this.adminService.createBanner(data);
  }

  @Put('banners/:id')
  updateBanner(@Param('id') id: string, @Body() data: any) {
    return this.adminService.updateBanner(id, data);
  }

  @Delete('banners/:id')
  deleteBanner(@Param('id') id: string) {
    return this.adminService.deleteBanner(id);
  }
}
