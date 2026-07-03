import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser, Roles, Public } from '../../common/decorators';
import { Role } from '../../common/enums';

@ApiTags('Support')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('support')
export class SupportController {
  constructor(private supportService: SupportService) {}

  @Public()
  @Get('faq')
  getFaqs() {
    return this.supportService.getFaqs();
  }

  @Post('tickets')
  createTicket(@CurrentUser() user: any, @Body() dto: { subject: string; description: string }) {
    const data =
      user.role === 'WORKER'
        ? { ...dto, workerId: user.id }
        : { ...dto, userId: user.id };
    return this.supportService.createTicket(data);
  }

  @Get('tickets')
  getMyTickets(
    @CurrentUser() user: any,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.supportService.getMyTickets(user.id, user.role, +page || 1, +limit || 10);
  }

  @Get('tickets/:id')
  getTicket(@Param('id') id: string, @CurrentUser() user: any) {
    return this.supportService.getTicket(id, user.id, user.role);
  }

  @Post('tickets/:id/reply')
  reply(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Body('message') message: string,
  ) {
    return this.supportService.replyToTicket(id, user.id, user.role, message);
  }

  // Admin only
  @Roles(Role.ADMIN)
  @Get('admin/tickets')
  getAllTickets(@Query('status') status: string, @Query('page') page: number, @Query('limit') limit: number) {
    return this.supportService.getAllTickets(status, +page || 1, +limit || 20);
  }

  @Roles(Role.ADMIN)
  @Put('admin/tickets/:id/resolve')
  resolveTicket(@Param('id') id: string) {
    return this.supportService.resolveTicket(id);
  }

  @Roles(Role.ADMIN)
  @Put('admin/tickets/:id/close')
  closeTicket(@Param('id') id: string) {
    return this.supportService.closeTicket(id);
  }
}
