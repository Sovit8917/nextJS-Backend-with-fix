import { Controller, Get, Put, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WorkersService } from './workers.service';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, Roles, Public } from '../../common/decorators';
import { Role } from '../../common/enums';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('Workers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('workers')
export class WorkersController {
  constructor(private workersService: WorkersService) {}

  @Public()
  @Get('nearby')
  @ApiOperation({ summary: 'Get nearby available workers' })
  getNearby(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('serviceId') serviceId?: string,
  ) {
    return this.workersService.getNearbyWorkers(+lat, +lng, serviceId);
  }

  @Roles(Role.WORKER)
  @Get('profile')
  getProfile(@CurrentUser('id') id: string) {
    return this.workersService.getProfile(id);
  }

  @Roles(Role.WORKER)
  @Put('profile')
  updateProfile(@CurrentUser('id') id: string, @Body() dto: UpdateWorkerDto) {
    return this.workersService.updateProfile(id, dto);
  }

  @Roles(Role.WORKER)
  @Put('location')
  updateLocation(
    @CurrentUser('id') id: string,
    @Body('latitude') latitude: number,
    @Body('longitude') longitude: number,
  ) {
    return this.workersService.updateLocation(id, latitude, longitude);
  }

  @Roles(Role.WORKER)
  @Put('status')
  setOnlineStatus(@CurrentUser('id') id: string, @Body('isOnline') isOnline: boolean) {
    return this.workersService.setOnlineStatus(id, isOnline);
  }

  @Roles(Role.WORKER)
  @Get('documents')
  getDocuments(@CurrentUser('id') id: string) {
    return this.workersService.getDocuments(id);
  }

  @Roles(Role.WORKER)
  @Post('documents')
  uploadDocument(
    @CurrentUser('id') id: string,
    @Body('type') type: string,
    @Body('url') url: string,
  ) {
    return this.workersService.uploadDocument(id, type, url);
  }

  @Roles(Role.WORKER)
  @Put('bank-details')
  updateBankDetails(@CurrentUser('id') id: string, @Body() data: any) {
    return this.workersService.updateBankDetails(id, data);
  }

  @Roles(Role.WORKER)
  @Put('skills')
  updateSkills(@CurrentUser('id') id: string, @Body('skills') skills: string[]) {
    return this.workersService.updateSkills(id, skills);
  }

  @Roles(Role.WORKER)
  @Put('services')
  updateServices(@CurrentUser('id') id: string, @Body('serviceIds') serviceIds: string[]) {
    return this.workersService.updateServices(id, serviceIds);
  }

  @Roles(Role.WORKER)
  @Get('working-hours')
  getWorkingHours(@CurrentUser('id') id: string) {
    return this.workersService.getWorkingHours(id);
  }

  @Roles(Role.WORKER)
  @Put('working-hours')
  setWorkingHours(@CurrentUser('id') id: string, @Body('hours') hours: any[]) {
    return this.workersService.setWorkingHours(id, hours);
  }

  @Roles(Role.WORKER)
  @Post('availability')
  setAvailability(
    @CurrentUser('id') id: string,
    @Body('date') date: Date,
    @Body('isOff') isOff: boolean,
  ) {
    return this.workersService.setAvailability(id, date, isOff);
  }

  @Get(':id/reviews')
  getReviews(
    @Param('id') id: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.workersService.getReviews(id, +page || 1, +limit || 10);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get public worker profile' })
  getPublicWorker(@Param('id') id: string) {
    return this.workersService.getPublicWorker(id);
  }
}
