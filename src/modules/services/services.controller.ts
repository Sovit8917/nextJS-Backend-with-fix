import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ServicesService } from './services.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public, Roles } from '../../common/decorators';
import { Role } from '../../common/enums';

@ApiTags('Services')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('services')
export class ServicesController {
  constructor(private servicesService: ServicesService) {}

  @Public()
  @Get()
  findAll(@Query('categoryId') categoryId?: string, @Query('search') search?: string) {
    return this.servicesService.findAll(categoryId, search);
  }

  @Public()
  @Get('popular')
  getPopular() {
    return this.servicesService.getPopular();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.servicesService.findOne(id);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() data: any) {
    return this.servicesService.create(data);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.servicesService.update(id, data);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.servicesService.remove(id);
  }
}
