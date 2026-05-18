import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import { Server } from 'socket.io';
import webpush from 'web-push';

@Injectable()
export class NotificationService {
  private server: Server;

  setServer(server: Server) {
    this.server = server;
  }

  constructor(private prisma: PrismaService) {}

  async create(
    userId: string,
    data: {
      type: NotificationType;
      title: string;
      message: string;
      link?: string;
      metadata?: any;
    },
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type: data.type,
        title: data.title,
        message: data.message,
        link: data.link || null,
        metadata: data.metadata || null,
      },
    });

    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    if (this.server) {
      this.server.to(`user:${userId}`).emit('notification', notification);
      this.server.to(`user:${userId}`).emit('unread-count', unreadCount);
    }

    await this.sendPush(userId, {
      title: data.title,
      body: data.message,
      url: data.link || '/',
    });

    return notification;
  }

  async createForUsers(
    userIds: string[],
    data: {
      type: NotificationType;
      title: string;
      message: string;
      link?: string;
      metadata?: any;
    },
  ) {
    const notifications = await Promise.all(
      userIds.map((userId) =>
        this.prisma.notification.create({
          data: {
            userId,
            type: data.type,
            title: data.title,
            message: data.message,
            link: data.link || null,
            metadata: data.metadata || null,
          },
        }),
      ),
    );

    await Promise.all(
      userIds.map((userId) =>
        this.sendPush(userId, {
          title: data.title,
          body: data.message,
          url: data.link || '/',
        }),
      ),
    );

    return notifications;
  }

  async getByUser(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      notifications,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    if (this.server) {
      const unreadCount = await this.prisma.notification.count({
        where: { userId, isRead: false },
      });
      this.server.to(`user:${userId}`).emit('unread-count', unreadCount);
    }

    return notification;
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    if (this.server) {
      this.server.to(`user:${userId}`).emit('unread-count', 0);
    }

    return { success: true };
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  private async sendPush(
    userId: string,
    payload: { title: string; body: string; url: string },
  ) {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (!vapidPublicKey || !vapidPrivateKey) {
      return;
    }

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:admin@qlda.vn',
      vapidPublicKey,
      vapidPrivateKey,
    );

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: { url: payload.url },
    });

    await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          pushPayload,
        ),
      ),
    );
  }
}
