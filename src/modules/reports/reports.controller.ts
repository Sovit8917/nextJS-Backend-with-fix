import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators';
import { Role } from '../../common/enums';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('dashboard')
  getDashboard() {
    return this.reportsService.getDashboardStats();
  }

  @Get('revenue')
  getRevenue(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('groupBy') groupBy: 'day' | 'month',
  ) {
    return this.reportsService.getRevenueReport(
      new Date(from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
      new Date(to || new Date()),
      groupBy || 'day',
    );
  }

  @Get('bookings')
  getBookings(@Query('from') from: string, @Query('to') to: string) {
    return this.reportsService.getBookingReport(
      new Date(from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
      new Date(to || new Date()),
    );
  }

  @Get('workers')
  getWorkers(@Query('from') from: string, @Query('to') to: string) {
    return this.reportsService.getWorkerReport(
      new Date(from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
      new Date(to || new Date()),
    );
  }

  @Get('customers')
  getCustomers(@Query('from') from: string, @Query('to') to: string) {
    return this.reportsService.getCustomerReport(
      new Date(from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
      new Date(to || new Date()),
    );
  }
}
