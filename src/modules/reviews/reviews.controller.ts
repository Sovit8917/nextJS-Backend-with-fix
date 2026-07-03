import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser, Roles } from '../../common/decorators';
import { Role } from '../../common/enums';

@ApiTags('Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Roles(Role.CUSTOMER)
  @Post()
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: { bookingId: string; rating: number; comment?: string; images?: string[] },
  ) {
    return this.reviewsService.create(userId, dto);
  }

  @Get('worker/:workerId')
  getWorkerReviews(
    @Param('workerId') workerId: string,
    @Query('page') page: number,
    @Query('limit') limit: number,
  ) {
    return this.reviewsService.getWorkerReviews(workerId, +page || 1, +limit || 10);
  }
}
