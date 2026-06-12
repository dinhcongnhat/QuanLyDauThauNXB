import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { NotificationService } from '../notifications/notification.service';
import { Server } from 'socket.io';

@Injectable()
export class ChatService {
  private server: Server;

  constructor(
    private prisma: PrismaService,
    private minioService: MinioService,
    private notificationService: NotificationService,
  ) {}

  setServer(server: Server) {
    this.server = server;
  }

  async getMessages(
    projectId: string,
    module?: string,
    cursor?: string,
    limit: number = 50,
  ) {
    const where: any = { projectId };
    if (module) where.module = module;
    if (cursor) where.createdAt = { lt: new Date(cursor) };

    const messages = await this.prisma.projectMessage.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true, department: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    const result = hasMore ? messages.slice(0, limit) : messages;

    return {
      messages: result.reverse(),
      hasMore,
      nextCursor: hasMore ? result[0]?.createdAt?.toISOString() : null,
    };
  }

  async sendMessage(
    projectId: string,
    userId: string,
    content: string,
    module?: string,
    type: string = 'TEXT',
    fileUrl?: string,
    fileName?: string,
    fileType?: string,
    fileSize?: number,
  ) {
    const message = await this.prisma.projectMessage.create({
      data: {
        projectId,
        userId,
        content,
        type,
        module: module || null,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileType: fileType || null,
        fileSize: fileSize || null,
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, department: true } },
      },
    });

    // Broadcast to project room
    if (this.server) {
      this.server.to(`project:${projectId}`).emit('new-message', message);
    }

    // Send webpush notifications to other project members
    try {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        include: {
          members: {
            select: { userId: true },
          },
        },
      });

      if (project) {
        const notifyUserIds = project.members
          .map((m: any) => m.userId)
          .filter((id: string) => id !== userId);

        if (notifyUserIds.length > 0) {
          await this.notificationService.createForUsers(notifyUserIds, {
            type: 'SYSTEM',
            title: `Thảo luận: ${project.tenDuAn}`,
            message: `${message.user.name}: ${type === 'TEXT' ? content : `[Đã gửi một ${type === 'IMAGE' ? 'ảnh' : 'tệp tin'}]`}`,
            link: `/dashboard/mua-sam/dat-sach/${projectId}`,
            metadata: {
              projectId,
              messageId: message.id,
            },
          });
        }
      }
    } catch (err) {
      console.error('[ChatService] Failed to send push notifications:', err);
    }

    return message;
  }

  async uploadFile(file: Express.Multer.File): Promise<{
    fileUrl: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }> {
    const objectName = `chat/${Date.now()}-${file.originalname}`;
    await this.minioService.upload(objectName, file.buffer, file.mimetype);
    const fileUrl = `/qldanxb/${objectName}`;
    return {
      fileUrl,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
    };
  }
}
