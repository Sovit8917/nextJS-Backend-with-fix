import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Public, Roles } from '../../common/decorators';
import { Role } from '../../common/enums';

@ApiTags('Coupons')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('coupons')
export class CouponsController {
  constructor(private couponsService: CouponsService) {}

  @Public()
  @Get('active')
  getActive() {
    return this.couponsService.getActive();
  }

  @Post('validate')
  validate(@Body('code') code: string, @Body('orderAmount') orderAmount: number) {
    return this.couponsService.validate(code, orderAmount);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Get()
  findAll(@Query('page') page: number, @Query('limit') limit: number) {
    return this.couponsService.findAll(+page || 1, +limit || 20);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: any) {
    return this.couponsService.create(dto);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.couponsService.update(id, dto);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.couponsService.remove(id);
  }
}
