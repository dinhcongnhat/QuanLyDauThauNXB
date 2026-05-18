import { Controller, Get, Put, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(
    private notificationService: NotificationService,
    private prisma: PrismaService,
  ) {}

  @Get()
  async list(@Request() req: any, @Query('page') page: string = '1') {
    return this.notificationService.getByUser(req.user.userId, parseInt(page));
  }

  @Get('unread-count')
  async unreadCount(@Request() req: any) {
    return { count: await this.notificationService.getUnreadCount(req.user.userId) };
  }

  @Put(':id/read')
  async markRead(@Param('id') id: string, @Request() req: any) {
    return this.notificationService.markRead(id, req.user.userId);
  }

  @Put('read-all')
  async markAllRead(@Request() req: any) {
    return this.notificationService.markAllRead(req.user.userId);
  }

  @Post('subscribe')
  async subscribe(@Request() req: any, @Body() body: { endpoint: string; p256dh: string; auth: string }) {
    return this.prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          userId: req.user.userId,
          endpoint: body.endpoint,
        },
      },
      update: {
        p256dh: body.p256dh,
        auth: body.auth,
      },
      create: {
        userId: req.user.userId,
        endpoint: body.endpoint,
        p256dh: body.p256dh,
        auth: body.auth,
      },
    });
  }

  @Post('unsubscribe')
  async unsubscribe(@Request() req: any, @Body() body: { endpoint: string }) {
    return this.prisma.pushSubscription.deleteMany({
      where: {
        userId: req.user.userId,
        endpoint: body.endpoint,
      },
    });
  }

  @Get('vapid-public-key')
  getVapidPublicKey() {
    return { publicKey: process.env.VAPID_PUBLIC_KEY || '' };
  }
}
