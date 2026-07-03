import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsListener } from './notifications.listener';
import { PushService } from './push.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsListener, PushService],
  exports: [NotificationsService, PushService],
})
export class NotificationsModule {}
